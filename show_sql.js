/**
 * Apply RLS policy fixes to Supabase using HTTP REST API
 * Uses Supabase project's pg connection
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually
const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('\n🔍 Supabase Project ID: theaotengnvtxlsyudmz');
console.log('\n📋 To fix RLS policies, go to the Supabase SQL Editor:');
console.log('   👉 https://supabase.com/dashboard/project/theaotengnvtxlsyudmz/sql/new\n');
console.log('━'.repeat(60));
console.log('\n📄 PASTE THIS SQL:\n');
console.log('━'.repeat(60));
const sql = fs.readFileSync('./fix_rls_policies.sql', 'utf-8');
console.log(sql);
console.log('━'.repeat(60));
console.log('\n✅ After running, test inserts should work without RLS errors.');
