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
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'gnome0259@gmail.com', password: 'Google@123456@'
  });
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
  });

  const companyId = 'a4dce0e6-f11e-4054-9b55-4b94f7f5143b';
  const userId = authData.user.id;

  console.log('\n=== 1. chat_channels (channels now have UUIDs?) ===');
  const { data: channels } = await client.from('chat_channels').select('id, name').limit(3);
  console.log('Channels:', channels);

  const channelId = channels?.[0]?.id;

  console.log('\n=== 2. chat_messages INSERT (after schema reload) ===');
  const { data: msgData, error: msgErr } = await client.from('chat_messages').insert({
    channel_id: channelId,
    company_id: companyId,
    author_id: userId,
    body: 'Test message after fix'
  }).select().single();
  console.log('Insert result:', msgData ? '✅ SUCCESS: ' + JSON.stringify(msgData) : '❌ ' + msgErr?.message);

  console.log('\n=== 3. admin_messages INSERT (for admin chat) ===');
  const employees = await client.from('profiles').select('id').eq('company_id', companyId).neq('id', userId).limit(1);
  const empId = employees.data?.[0]?.id;
  
  const { error: adminMsgErr } = await client.from('admin_messages').insert({
    company_id: companyId,
    sender_id: userId,
    receiver_id: empId,
    message_type: 'general',
    body: 'Test direct message',
    is_broadcast: false,
    disable_replies: false,
    require_acknowledgement: false,
  });
  console.log('admin_messages insert:', adminMsgErr ? '❌ ' + adminMsgErr.message : '✅ SUCCESS');

  console.log('\n=== 4. admin_permissions (final verification) ===');
  const { data: perms } = await client.from('admin_permissions').select('*').eq('company_id', companyId);
  console.log(`Found ${perms?.length || 0} permission records:`);
  perms?.forEach(p => console.log(`  admin_id: ${p.admin_id}, can_manage_payroll: ${p.can_manage_payroll}`));
}

run();
