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
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function run() {
  loadEnvLocal();

  const host = requireEnv('DB_HOST');
  const port = Number(process.env.DB_PORT || 3306);
  const database = requireEnv('DB_NAME');
  const user = requireEnv('DB_USER');
  const password = requireEnv('DB_PASSWORD');

  const connection = await mysql.createConnection({
    host,
    port,
    database,
    user,
    password,
  });

  try {
    const [rows] = await connection.query('SELECT DATABASE() AS db, NOW() AS server_time');
    const [countRows] = await connection.query('SELECT COUNT(*) AS total FROM comics');

    console.log('DB connection: OK');
    console.log(`Host: ${host}:${port}`);
    console.log(`Database: ${rows[0].db}`);
    console.log(`Server time: ${rows[0].server_time}`);
    console.log(`Comics rows: ${countRows[0].total}`);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('DB connection: FAILED');
  console.error(error.message);
  process.exit(1);
});
