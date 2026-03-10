const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = rawValue;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function ensureTable(connection) {
  await connection.query(`
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
      INDEX idx_comics_name (name),
      INDEX idx_comics_company (company),
      INDEX idx_comics_issue (issue_number),
      INDEX idx_comics_year (year_published)
    )
  `);
}

function normalizeComic(raw) {
  return {
    id: String(raw.id ?? Date.now()),
    name: String(raw.name ?? '').trim(),
    company: String(raw.company ?? '').trim() || 'Unknown',
    issueNumber: Number(raw.issueNumber ?? 0),
    year: Number(raw.year ?? 0),
    condition: String(raw.condition ?? '').trim() || 'Unknown',
    description: String(raw.description ?? '').trim() || 'No description.',
    imageUrl: String(raw.imageUrl ?? '').trim(),
    cbdbUrl: raw.cbdbUrl ? String(raw.cbdbUrl).trim() : null,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
  };
}

async function run() {
  loadEnvLocal();

  const dbConfig = {
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || 3306),
    database: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
  };

  const dataPath = path.join(process.cwd(), 'data', 'comics.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Missing source file: ${dataPath}`);
  }

  const rawList = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  if (!Array.isArray(rawList)) {
    throw new Error('data/comics.json must contain an array');
  }

  const connection = await mysql.createConnection(dbConfig);

  try {
    await ensureTable(connection);

    let upserted = 0;

    for (const raw of rawList) {
      const comic = normalizeComic(raw);
      if (!comic.name || !comic.issueNumber || !comic.year) {
        continue;
      }

      await connection.execute(
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
          ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            company = VALUES(company),
            issue_number = VALUES(issue_number),
            year_published = VALUES(year_published),
            comic_condition = VALUES(comic_condition),
            description = VALUES(description),
            image_url = VALUES(image_url),
            cbdb_url = VALUES(cbdb_url),
            created_at = VALUES(created_at)
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
          comic.cbdbUrl,
          comic.createdAt,
        ]
      );

      upserted += 1;
    }

    console.log(`Import complete. Upserted ${upserted} comics into MySQL.`);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('Import failed:', error.message);
  process.exit(1);
});
