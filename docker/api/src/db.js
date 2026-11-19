import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://normaliza:normaliza@db:5432/normaliza',
  max: 10
});

export async function migrate() {
  const directory = path.resolve('migrations');
  const files = (await fs.readdir(directory))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const client = await pool.connect();

  try {
    await client.query('begin');
    for (const file of files) {
      const sql = await fs.readFile(path.join(directory, file), 'utf8');
      await client.query(sql);
    }
    await client.query('commit');
    console.log(`Migrations aplicadas: ${files.join(', ')}`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
