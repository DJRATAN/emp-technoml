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
  console.log("Logging in as admin gnome0259@gmail.com...");
  const { data: authData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'gnome0259@gmail.com', password: 'Google@123456@'
  });

  if (loginErr) {
    console.error("Login failed:", loginErr.message);
    return;
  }

  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
  });

  const { data: profiles, error } = await client
    .from('profiles')
    .select('id, full_name, avatar_url, id_card_url');

  if (error) {
    console.error("Error fetching profiles:", error.message);
    return;
  }

  console.log("Profiles with files:");
  profiles.forEach(p => {
    if (p.avatar_url || p.id_card_url) {
      console.log(`- ID: ${p.id}, Name: ${p.full_name}, Avatar: ${p.avatar_url}, ID Card: ${p.id_card_url}`);
    }
  });
}

run();
