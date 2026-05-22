import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const DB_PASSWORD = process.env.DB_PASSWORD;
const PROJECT_REF = 'theaotengnvtxlsyudmz';

if (!DB_PASSWORD) {
  console.error('\n❌ ERROR: DB_PASSWORD env variable is required!');
  console.error('USAGE: DB_PASSWORD=your_supabase_db_password node apply_migration.js');
  console.error('\nFind your password at:');
  console.error('  https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/database');
  console.error('\nOr, copy the SQL in ./supabase/add_feature_visibility.sql and paste it into the Supabase SQL editor at:');
  console.error('  https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new\n');
  process.exit(1);
}

const connectionString = `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;
const sql = fs.readFileSync('./supabase/add_feature_visibility.sql', 'utf-8');

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected!');
    
    console.log('🔧 Running database migration...');
    await client.query(sql);
    console.log('✅ Database migration applied successfully!');
  } catch (err) {
    console.error('❌ Error applying migration:', err.message);
  } finally {
    await client.end();
  }
}

run();
