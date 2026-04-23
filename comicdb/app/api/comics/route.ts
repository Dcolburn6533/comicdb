import { NextRequest, NextResponse } from 'next/server';
import { ensureComicsTable, ensureComicImagesTable, getDbPool, ComicRow, ComicImageRow } from '@/lib/db';

interface Comic {
  id: string;
  name: string;
  company: string;
  issueNumber: number;
  year: number;
  condition: string;
  description: string;
  price?: number;
  imageUrl: string;
  cbdbUrl?: string;
  additionalImages?: string[];
  createdAt: string;
  hidden?: boolean;
}

function normalizePrice(price: ComicRow['price']): number | undefined {
  if (price === null || typeof price === 'undefined') {
    return undefined;
  }
  if (typeof price === 'number') {
    return Number.isFinite(price) ? price : undefined;
  }
  const parsed = Number.parseFloat(price);
  return Number.isFinite(parsed) ? parsed : undefined;
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
    price: normalizePrice(row.price),
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
    await ensureComicImagesTable();
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
          price,
          image_url,
          cbdb_url,
          created_at,
          hidden
        FROM comics
        ${includeHidden ? '' : 'WHERE hidden = 0'}
        ORDER BY created_at DESC
      `
    );

    // Fetch additional images for all comics
    const [imageRows] = await db.query<ComicImageRow[]>(
      'SELECT * FROM comic_images ORDER BY sort_order ASC, id ASC'
    );
    const imagesByComic = new Map<string, string[]>();
    for (const img of imageRows) {
      const list = imagesByComic.get(img.comic_id) ?? [];
      list.push(img.image_url);
      imagesByComic.set(img.comic_id, list);
    }

    const comics = rows.map((row) => ({
      ...rowToComic(row),
      additionalImages: imagesByComic.get(row.id) ?? [],
    }));
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
    await ensureComicImagesTable();

    const validatedPrice =
      typeof comic.price === 'number' && Number.isFinite(comic.price) && comic.price >= 0
        ? comic.price
        : null;

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
          price,
          image_url,
          cbdb_url,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        comic.id,
        comic.name,
        comic.company,
        comic.issueNumber,
        comic.year,
        comic.condition,
        comic.description,
        validatedPrice,
        comic.imageUrl,
        comic.cbdbUrl || null,
        new Date(comic.createdAt),
      ]
    );

    if (Array.isArray(comic.additionalImages) && comic.additionalImages.length > 0) {
      const cleaned = comic.additionalImages
        .map((url) => (typeof url === 'string' ? url.trim() : ''))
        .filter((url) => url.length > 0);

      for (let index = 0; index < cleaned.length; index++) {
        await db.execute(
          'INSERT INTO comic_images (comic_id, image_url, sort_order) VALUES (?, ?, ?)',
          [comic.id, cleaned[index], index]
        );
      }
    }
    
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
    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await ensureComicsTable();
    const db = getDbPool();

    const updates: string[] = [];
    const values: Array<string | number | null> = [];

    if (typeof body.name === 'string') {
      updates.push('name = ?');
      values.push(body.name.trim());
    }
    if (typeof body.company === 'string') {
      updates.push('company = ?');
      values.push(body.company.trim());
    }
    if (typeof body.issueNumber === 'number') {
      updates.push('issue_number = ?');
      values.push(body.issueNumber);
    }
    if (typeof body.year === 'number') {
      updates.push('year_published = ?');
      values.push(body.year);
    }
    if (typeof body.condition === 'string') {
      updates.push('comic_condition = ?');
      values.push(body.condition.trim());
    }
    if (typeof body.description === 'string') {
      updates.push('description = ?');
      values.push(body.description.trim());
    }
    if (Object.prototype.hasOwnProperty.call(body, 'price')) {
      if (body.price === null || body.price === '') {
        updates.push('price = ?');
        values.push(null);
      } else if (typeof body.price === 'number' && Number.isFinite(body.price) && body.price >= 0) {
        updates.push('price = ?');
        values.push(body.price);
      } else {
        return NextResponse.json({ error: 'Invalid price value' }, { status: 400 });
      }
    }
    if (typeof body.imageUrl === 'string') {
      updates.push('image_url = ?');
      values.push(body.imageUrl.trim());
    }
    if (Object.prototype.hasOwnProperty.call(body, 'cbdbUrl')) {
      updates.push('cbdb_url = ?');
      const cbdb = typeof body.cbdbUrl === 'string' ? body.cbdbUrl.trim() : '';
      values.push(cbdb || null);
    }
    if (typeof body.hidden === 'boolean') {
      updates.push('hidden = ?');
      values.push(body.hidden ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(id);

    const [result] = await db.execute(
      `UPDATE comics SET ${updates.join(', ')} WHERE id = ?`,
      values
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
