import mysql, { Pool, RowDataPacket } from 'mysql2/promise';

let pool: Pool | null = null;
let tableEnsured = false;
let authTablesEnsured = false;
let offersTableEnsured = false;
let comicImagesTableEnsured = false;

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
      price DECIMAL(10, 2) NULL,
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

  // Add price column to existing tables that predate this field
  const [priceCols] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comics' AND COLUMN_NAME = 'price'`
  );
  if ((priceCols as RowDataPacket[]).length === 0) {
    await db.query(`ALTER TABLE comics ADD COLUMN price DECIMAL(10, 2) NULL AFTER description`);
  }

  tableEnsured = true;
}

export async function ensureAuthTables(): Promise<void> {
  if (authTablesEnsured) {
    return;
  }

  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id VARCHAR(128) PRIMARY KEY,
      user_id INT NOT NULL,
      username VARCHAR(100) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    )
  `);

  authTablesEnsured = true;
}

export async function ensureOffersTable(): Promise<void> {
  if (offersTableEnsured) return;
  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS offers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      comic_id VARCHAR(64) NOT NULL,
      comic_ids TEXT NULL,
      sender_name VARCHAR(255) NOT NULL,
      sender_phone VARCHAR(50) NOT NULL,
      sender_email VARCHAR(255) NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
    )
  `);

  // Add comic_ids column to existing tables that predate this field
  const [cols] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'offers' AND COLUMN_NAME = 'comic_ids'`
  );
  if ((cols as RowDataPacket[]).length === 0) {
    await db.query(`ALTER TABLE offers ADD COLUMN comic_ids TEXT NULL AFTER comic_id`);
  }

  // Add sender_email column to existing tables that predate this field
  const [emailCols] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'offers' AND COLUMN_NAME = 'sender_email'`
  );
  if ((emailCols as RowDataPacket[]).length === 0) {
    await db.query(`ALTER TABLE offers ADD COLUMN sender_email VARCHAR(255) NULL AFTER sender_phone`);
  }

  offersTableEnsured = true;
}

export async function ensureComicImagesTable(): Promise<void> {
  if (comicImagesTableEnsured) return;
  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS comic_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      comic_id VARCHAR(64) NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE
    )
  `);
  comicImagesTableEnsured = true;
}

export interface OfferRow extends RowDataPacket {
  id: number;
  comic_id: string;
  comic_ids: string | null;
  sender_name: string;
  sender_phone: string;
  sender_email: string | null;
  message: string;
  is_read: number;
  created_at: Date | string;
}

export interface ComicImageRow extends RowDataPacket {
  id: number;
  comic_id: string;
  image_url: string;
  sort_order: number;
  created_at: Date | string;
}

export interface AdminUserRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date | string;
}

export interface AdminSessionRow extends RowDataPacket {
  id: string;
  user_id: number;
  username: string;
  created_at: Date | string;
  expires_at: Date | string;
}

export interface ComicRow extends RowDataPacket {
  id: string;
  name: string;
  company: string;
  issue_number: number;
  year_published: number;
  comic_condition: string;
  description: string;
  price: number | string | null;
  image_url: string;
  cbdb_url: string | null;
  created_at: Date | string;
  hidden: number;
}
