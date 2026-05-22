import pg from 'pg';
const { Client } = pg;

const DB_PASSWORD = 'Google@123456@';
const PROJECT_REF = 'theaotengnvtxlsyudmz';
const connectionString = `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('SUCCESS! Connected to PostgreSQL.');
    const res = await client.query('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'');
    console.log('Tables in public schema:', res.rows.map(r => r.tablename));
  } catch (e) {
    console.error('Connection failed:', e.message);
  } finally {
    await client.end();
  }
}

run();
