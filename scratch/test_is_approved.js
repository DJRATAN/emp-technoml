import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log('Calling is_approved RPC...');
  const { data, error } = await supabase.rpc('is_approved', {
    _user_id: '1f9d348a-e0cf-4c2b-9fca-390720844cf4'
  });
  
  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Result:', data);
  }
}

run();
