import { NextRequest, NextResponse } from 'next/server';
import { ensureComicImagesTable, ensureComicsTable, getDbPool, ComicImageRow } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const comicId = searchParams.get('comicId');
    await ensureComicsTable();
    await ensureComicImagesTable();
    const db = getDbPool();

    if (comicId) {
      const [rows] = await db.query<ComicImageRow[]>(
        'SELECT * FROM comic_images WHERE comic_id = ? ORDER BY sort_order ASC, id ASC',
        [comicId]
      );
      return NextResponse.json({ images: rows.map(rowToImage) });
    }

    const [rows] = await db.query<ComicImageRow[]>(
      'SELECT * FROM comic_images ORDER BY comic_id, sort_order ASC, id ASC'
    );
    return NextResponse.json({ images: rows.map(rowToImage) });
  } catch (error) {
    console.error('Error fetching comic images:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { comicId, imageUrls } = await request.json();
    if (!comicId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'comicId and imageUrls[] are required' }, { status: 400 });
    }
    await ensureComicsTable();
    await ensureComicImagesTable();
    const db = getDbPool();

    // Get current max sort_order for this comic
    const [existing] = await db.query<ComicImageRow[]>(
      'SELECT MAX(sort_order) as max_order FROM comic_images WHERE comic_id = ?',
      [comicId]
    );
    let nextOrder = ((existing[0] as any)?.max_order ?? -1) + 1;

    for (const url of imageUrls) {
      if (typeof url === 'string' && url.trim()) {
        await db.execute(
          'INSERT INTO comic_images (comic_id, image_url, sort_order) VALUES (?, ?, ?)',
          [comicId, url.trim(), nextOrder++]
        );
      }
    }

    // Return updated list
    const [rows] = await db.query<ComicImageRow[]>(
      'SELECT * FROM comic_images WHERE comic_id = ? ORDER BY sort_order ASC, id ASC',
      [comicId]
    );
    return NextResponse.json({ images: rows.map(rowToImage) });
  } catch (error) {
    console.error('Error adding comic images:', error);
    return NextResponse.json({ error: 'Failed to add images' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }
    await ensureComicImagesTable();
    const db = getDbPool();
    await db.execute('DELETE FROM comic_images WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comic image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}

function rowToImage(row: ComicImageRow) {
  return {
    id: row.id,
    comicId: row.comic_id,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
  };
}
