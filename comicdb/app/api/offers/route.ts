import { NextRequest, NextResponse } from 'next/server';
import { ensureOffersTable, ensureComicsTable, getDbPool, OfferRow, ComicRow } from '@/lib/db';
import { RowDataPacket } from 'mysql2/promise';

export async function GET() {
  try {
    await ensureComicsTable();
    await ensureOffersTable();
    const db = getDbPool();

    const [offerRows] = await db.query<OfferRow[]>('SELECT * FROM offers ORDER BY created_at DESC');

    // Collect all unique comic IDs across all offers
    const allComicIds = new Set<string>();
    for (const row of offerRows) {
      if (row.comic_ids) {
        try { (JSON.parse(row.comic_ids) as string[]).forEach((id) => allComicIds.add(id)); } catch {}
      } else if (row.comic_id) {
        allComicIds.add(row.comic_id);
      }
    }

    // Fetch comic details in one query
    const comicMap = new Map<string, { name: string; issueNumber: number; year: number }>();
    if (allComicIds.size > 0) {
      const idList = [...allComicIds];
      const placeholders = idList.map(() => '?').join(',');
      const [comicRows] = await db.query<ComicRow[]>(
        `SELECT id, name, issue_number, year_published FROM comics WHERE id IN (${placeholders})`,
        idList
      );
      for (const c of comicRows) {
        comicMap.set(c.id, { name: c.name, issueNumber: c.issue_number, year: c.year_published });
      }
    }

    const offers = offerRows.map((r) => {
      let comicIds: string[] = [];
      if (r.comic_ids) {
        try { comicIds = JSON.parse(r.comic_ids); } catch {}
      }
      if (comicIds.length === 0 && r.comic_id) {
        comicIds = [r.comic_id];
      }

      const comics = comicIds.map((id) => {
        const c = comicMap.get(id);
        return c
          ? { id, name: c.name, issueNumber: c.issueNumber, year: c.year }
          : { id, name: 'Deleted comic', issueNumber: 0, year: 0 };
      });

      return {
        id: r.id,
        comicId: r.comic_id,
        comicName: comicMap.get(r.comic_id)?.name ?? 'Deleted comic',
        comics,
        senderName: r.sender_name,
        senderPhone: r.sender_phone,
        senderEmail: r.sender_email ?? '',
        message: r.message,
        isRead: r.is_read === 1,
        createdAt: typeof r.created_at === 'string'
          ? new Date(r.created_at).toISOString()
          : r.created_at.toISOString(),
      };
    });

    return NextResponse.json({ offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json({ error: 'Failed to fetch offers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderName, senderPhone, senderEmail, message } = body;

    // Support comicIds array (new) or legacy comicId (single)
    let comicIds: string[] = [];
    if (Array.isArray(body.comicIds) && body.comicIds.length > 0) {
      comicIds = body.comicIds;
    } else if (body.comicId) {
      comicIds = [body.comicId];
    }

    const emailValue = String(senderEmail ?? '').trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

    if (
      comicIds.length === 0 ||
      !senderName?.trim() ||
      !senderPhone?.trim() ||
      !emailValue ||
      !isValidEmail ||
      !message?.trim()
    ) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    await ensureComicsTable();
    await ensureOffersTable();
    const db = getDbPool();

    // Verify all comics exist
    const placeholders = comicIds.map(() => '?').join(',');
    const [found] = await db.query<ComicRow[]>(
      `SELECT id FROM comics WHERE id IN (${placeholders})`,
      comicIds
    );
    if (found.length !== comicIds.length) {
      return NextResponse.json({ error: 'One or more comics not found' }, { status: 404 });
    }

    const primaryComicId = comicIds[0];
    await db.execute(
      'INSERT INTO offers (comic_id, comic_ids, sender_name, sender_phone, sender_email, message) VALUES (?, ?, ?, ?, ?, ?)',
      [primaryComicId, JSON.stringify(comicIds), senderName.trim(), senderPhone.trim(), emailValue, message.trim()]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json({ error: 'Failed to send offer' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, isRead } = await request.json();
    if (!id || typeof isRead !== 'boolean') {
      return NextResponse.json({ error: 'id and isRead are required' }, { status: 400 });
    }
    await ensureOffersTable();
    const db = getDbPool();
    await db.execute('UPDATE offers SET is_read = ? WHERE id = ?', [isRead ? 1 : 0, id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating offer:', error);
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Offer ID is required' }, { status: 400 });
    }
    await ensureOffersTable();
    const db = getDbPool();
    await db.execute('DELETE FROM offers WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting offer:', error);
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 });
  }
}
