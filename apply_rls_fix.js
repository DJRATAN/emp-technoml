/**
 * Auto-apply RLS policy fixes via Supabase Management API
 * 
 * HOW TO USE:
 * 1. Go to https://app.supabase.com/account/tokens
 * 2. Create a new personal access token
 * 3. Run: SUPABASE_ACCESS_TOKEN=your_token node apply_rls_fix.js
 * 
 * OR just copy fix_rls_policies.sql into the Supabase SQL Editor at:
 * https://supabase.com/dashboard/project/theaotengnvtxlsyudmz/sql/new
 */
import fs from 'fs';
import https from 'https';

const PROJECT_ID = 'theaotengnvtxlsyudmz';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('\n❌ ERROR: SUPABASE_ACCESS_TOKEN is required!');
  console.error('\n📋 Instructions:');
  console.error('  1. Go to: https://app.supabase.com/account/tokens');
  console.error('  2. Create a Personal Access Token');
  console.error('  3. Run: SUPABASE_ACCESS_TOKEN=your_token node apply_rls_fix.js');
  console.error('\n📄 Alternative: Manually run fix_rls_policies.sql in:');
  console.error('   https://supabase.com/dashboard/project/' + PROJECT_ID + '/sql/new');
  process.exit(1);
}

const sqlContent = fs.readFileSync('./fix_rls_policies.sql', 'utf-8');

const body = JSON.stringify({ query: sqlContent });
const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_ID}/database/query`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  }
};

console.log('🔧 Applying RLS policy fixes...');
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('✅ RLS policies fixed successfully!');
        console.log('Result:', result);
      } else {
        console.error('❌ Failed:', res.statusCode, result);
      }
    } catch {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.write(body);
req.end();
