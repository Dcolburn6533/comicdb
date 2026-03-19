import mysql, { Pool, RowDataPacket } from 'mysql2/promise';

let pool: Pool | null = null;
let tableEnsured = false;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getDbPool(): Pool {
  if (pool) {
    return pool;
  }

  pool = mysql.createPool({
    host: getRequiredEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? 3306),
    database: getRequiredEnv('DB_NAME'),
    user: getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return pool;
}

export async function ensureComicsTable(): Promise<void> {
  if (tableEnsured) {
    return;
  }

  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS comics (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      issue_number INT NOT NULL,
      year_published INT NOT NULL,
      comic_condition VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      cbdb_url TEXT NULL,
      created_at DATETIME NOT NULL,
      hidden TINYINT(1) NOT NULL DEFAULT 0
    )
  `);

  // Add hidden column to existing tables that predate this field
  const [cols] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comics' AND COLUMN_NAME = 'hidden'`
  );
  if ((cols as RowDataPacket[]).length === 0) {
    await db.query(`ALTER TABLE comics ADD COLUMN hidden TINYINT(1) NOT NULL DEFAULT 0`);
  }

  tableEnsured = true;
}

export interface ComicRow extends RowDataPacket {
  id: string;
  name: string;
  company: string;
  issue_number: number;
  year_published: number;
  comic_condition: string;
  description: string;
  image_url: string;
  cbdb_url: string | null;
  created_at: Date | string;
  hidden: number;
}
