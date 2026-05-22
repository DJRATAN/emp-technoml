/**
 * Apply RLS policy fixes directly via pg (PostgreSQL client)
 * 
 * Supabase DB connection string format:
 * postgresql://postgres:[YOUR-PASSWORD]@db.theaotengnvtxlsyudmz.supabase.co:5432/postgres
 * 
 * USAGE: DB_PASSWORD=yourpassword node apply_rls_pg.js
 */
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const DB_PASSWORD = process.env.DB_PASSWORD;
const PROJECT_REF = 'theaotengnvtxlsyudmz';

if (!DB_PASSWORD) {
  console.error('\n❌ ERROR: DB_PASSWORD is required!\n');
  console.error('USAGE: DB_PASSWORD=your_supabase_db_password node apply_rls_pg.js');
  console.error('\nFind your password at:');
  console.error('  https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/database\n');
  process.exit(1);
}

const connectionString = `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

const sql = fs.readFileSync('./fix_rls_policies.sql', 'utf-8');

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  
  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected!\n');
    
    console.log('🔧 Applying RLS policy fixes...');
    await client.query(sql);
    console.log('✅ All RLS policies fixed successfully!\n');
    
    // Verify the new policies
    const result = await client.query(`
      SELECT tablename, policyname, cmd, roles 
      FROM pg_policies 
      WHERE tablename IN ('chat_channels', 'kudos', 'admin_permissions', 'chat_messages')
      AND schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    
    console.log('📋 Current policies after fix:');
    console.table(result.rows);
    
    // Check if unique constraint was added
    const constraint = await client.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conrelid = 'admin_permissions'::regclass
      AND conname = 'admin_permissions_company_id_admin_id_key';
    `);
    
    if (constraint.rows.length > 0) {
      console.log('\n✅ Unique constraint on admin_permissions(company_id, admin_id) confirmed!');
    } else {
      console.log('\n⚠️  Unique constraint may not have been added. Upsert will still use select-then-insert.');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
