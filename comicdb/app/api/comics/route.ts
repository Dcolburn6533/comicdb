import { NextRequest, NextResponse } from 'next/server';
import { ensureComicsTable, getDbPool, ComicRow } from '@/lib/db';

interface Comic {
  id: string;
  name: string;
  company: string;
  issueNumber: number;
  year: number;
  condition: string;
  description: string;
  imageUrl: string;
  cbdbUrl?: string;
  createdAt: string;
  hidden?: boolean;
}

function rowToComic(row: ComicRow): Comic {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    issueNumber: row.issue_number,
    year: row.year_published,
    condition: row.comic_condition,
    description: row.description,
    imageUrl: row.image_url,
    cbdbUrl: row.cbdb_url ?? undefined,
    createdAt:
      typeof row.created_at === 'string'
        ? new Date(row.created_at).toISOString()
        : row.created_at.toISOString(),
    hidden: row.hidden === 1,
  };
}

export async function GET(request: NextRequest) {
  try {
    await ensureComicsTable();
    const db = getDbPool();
    const { searchParams } = new URL(request.url);
    const includeHidden = searchParams.get('includeHidden') === 'true';

    const [rows] = await db.query<ComicRow[]>(
      `
        SELECT
          id,
          name,
          company,
          issue_number,
          year_published,
          comic_condition,
          description,
          image_url,
          cbdb_url,
          created_at,
          hidden
        FROM comics
        ${includeHidden ? '' : 'WHERE hidden = 0'}
        ORDER BY created_at DESC
      `
    );

    const comics = rows.map(rowToComic);
    return NextResponse.json({ comics });
  } catch (error) {
    console.error('Error reading comics:', error);
    return NextResponse.json({ error: 'Failed to fetch comics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const comic: Comic = await request.json();
    await ensureComicsTable();

    const db = getDbPool();
    await db.execute(
      `
        INSERT INTO comics (
          id,
          name,
          company,
          issue_number,
          year_published,
          comic_condition,
          description,
          image_url,
          cbdb_url,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        comic.id,
        comic.name,
        comic.company,
        comic.issueNumber,
        comic.year,
        comic.condition,
        comic.description,
        comic.imageUrl,
        comic.cbdbUrl || null,
        new Date(comic.createdAt),
      ]
    );
    
    return NextResponse.json({ success: true, comic });
  } catch (error) {
    console.error('Error adding comic:', error);
    return NextResponse.json(
      { error: 'Failed to add comic' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, hidden } = await request.json();
    if (!id || typeof hidden !== 'boolean') {
      return NextResponse.json({ error: 'id and hidden are required' }, { status: 400 });
    }

    await ensureComicsTable();
    const db = getDbPool();
    const [result] = await db.execute(
      'UPDATE comics SET hidden = ? WHERE id = ?',
      [hidden ? 1 : 0, id]
    );

    const affectedRows = (result as { affectedRows: number }).affectedRows;
    if (affectedRows === 0) {
      return NextResponse.json({ error: 'Comic not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating comic visibility:', error);
    return NextResponse.json({ error: 'Failed to update comic' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Comic ID is required' },
        { status: 400 }
      );
    }
    
    await ensureComicsTable();
    const db = getDbPool();
    const [result] = await db.execute(
      'DELETE FROM comics WHERE id = ?',
      [id]
    );

    const affectedRows = (result as { affectedRows: number }).affectedRows;
    if (affectedRows === 0) {
      return NextResponse.json(
        { error: 'Comic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comic:', error);
    return NextResponse.json(
      { error: 'Failed to delete comic' },
      { status: 500 }
    );
  }
}
