import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('./.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
    env[match[1]] = value;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'gnome0259@gmail.com', password: 'Google@123456@'
  });
  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
  });

  const { data: profiles, error } = await client.from('profiles')
    .select('id, full_name, email, avatar_url, id_card_url, employee_internal_id');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Profiles data:');
    console.table(profiles);
  }
}

run();
