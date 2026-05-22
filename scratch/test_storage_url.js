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

  const userId = authData.user.id;
  const mockPath = `${userId}/test_avatar.png`;

  console.log('1. Attempting to update profile avatar_url to:', mockPath);
  const { error: updateError } = await client.from('profiles')
    .update({ avatar_url: mockPath })
    .eq('id', userId);
  
  if (updateError) {
    console.error('❌ Failed to update profile:', updateError.message);
  } else {
    console.log('✅ Updated profile avatar_url');
  }

  console.log('2. Trying to create signed URL for path:', mockPath);
  const { data: signedData, error: signedError } = await client.storage
    .from('avatars')
    .createSignedUrl(mockPath, 3600);

  if (signedError) {
    console.error('❌ Failed to create signed URL:', signedError.message);
  } else {
    console.log('✅ Signed URL success:', signedData.signedUrl);
  }
}

run();
