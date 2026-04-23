import { NextRequest, NextResponse } from 'next/server';
import { ensureAuthTables, getDbPool, AdminSessionRow } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;

    if (!sessionId) {
      return NextResponse.json({ authenticated: false });
    }

    await ensureAuthTables();
    const db = getDbPool();

    const [sessions] = await db.query<AdminSessionRow[]>(
      'SELECT * FROM admin_sessions WHERE id = ? AND expires_at > NOW()',
      [sessionId]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      username: sessions[0].username,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
