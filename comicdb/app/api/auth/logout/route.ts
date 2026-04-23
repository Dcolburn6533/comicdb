import { NextRequest, NextResponse } from 'next/server';
import { ensureAuthTables, getDbPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;

    if (sessionId) {
      await ensureAuthTables();
      const db = getDbPool();
      await db.execute('DELETE FROM admin_sessions WHERE id = ?', [sessionId]);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
