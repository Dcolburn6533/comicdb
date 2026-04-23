import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureAuthTables, getDbPool, AdminUserRow } from '@/lib/db';

const ADMIN_ACCOUNTS = [
  { username: 'djc6533', password: 'Dburn1976!' },
  { username: 'bird', password: 'XCollectibles140' },
  { username: 'mergetech01', password: '!Mergetech19' },
];

export async function POST() {
  try {
    await ensureAuthTables();
    const db = getDbPool();
    const results: string[] = [];

    for (const account of ADMIN_ACCOUNTS) {
      const [existing] = await db.query<AdminUserRow[]>(
        'SELECT id FROM admin_users WHERE username = ?',
        [account.username]
      );

      const hash = await bcrypt.hash(account.password, 12);

      if (existing.length > 0) {
        await db.execute(
          'UPDATE admin_users SET password_hash = ? WHERE username = ?',
          [hash, account.username]
        );
        results.push(`${account.username}: updated`);
        continue;
      }

      await db.execute(
        'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
        [account.username, hash]
      );
      results.push(`${account.username}: created`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error seeding admin accounts:', error);
    return NextResponse.json({ error: 'Failed to seed admin accounts' }, { status: 500 });
  }
}
