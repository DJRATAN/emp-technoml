import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envPath = './.env';
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function run() {
  console.log('Logging in as admin to run schema inspection...');
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'gnome0259@gmail.com', password: 'Google@123456@'
  });
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
  });

  // Query table columns using a rpc if exists, or check via direct query if allowed, or we can check what columns we can fetch or query.
  // Wait, does PostgreSQL allow us to select from a view or run an ad-hoc query?
  // Let's see if we can do custom postgres query. If we can run a select on information_schema.columns via PostgREST it usually fails,
  // but let's see. Or let's see if we can read the supabase schema file if it's stored locally.
  const { data, error } = await client
    .from('company_features')
    .select('*')
    .limit(0);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Columns fetched successfully (empty select):', data);
  }
}

run();
