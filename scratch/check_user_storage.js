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

  const targetUserId = '0dc0a2a1-6bf3-4023-8100-1a9ca3beb9bb';
  const { data: profile } = await client.from('profiles').select('avatar_url, id_card_url').eq('id', targetUserId).single();
  console.log("Profile data from DB:", profile);

  if (profile) {
    if (profile.avatar_url) {
      console.log("Creating signed URL for avatar...");
      const { data: avatarData, error: avatarErr } = await client.storage.from('avatars').createSignedUrl(profile.avatar_url, 3600);
      if (avatarErr) {
        console.error("❌ Admin failed to create signed url for avatar:", avatarErr.message);
      } else {
        console.log("✅ Admin Avatar signed URL:", avatarData.signedUrl);
      }

      console.log("Getting public URL for avatar...");
      const pubUrl = client.storage.from('avatars').getPublicUrl(profile.avatar_url).data.publicUrl;
      console.log("Avatar Public URL:", pubUrl);
    }

    if (profile.id_card_url) {
      console.log("Creating signed URL for id-card...");
      const { data: idCardData, error: idCardErr } = await client.storage.from('id-cards').createSignedUrl(profile.id_card_url, 3600);
      if (idCardErr) {
        console.error("❌ Admin failed to create signed url for id-card:", idCardErr.message);
      } else {
        console.log("✅ Admin ID Card signed URL:", idCardData.signedUrl);
      }

      console.log("Getting public URL for id-card...");
      const pubUrl = client.storage.from('id-cards').getPublicUrl(profile.id_card_url).data.publicUrl;
      console.log("ID Card Public URL:", pubUrl);
    }
  }
}

run();
