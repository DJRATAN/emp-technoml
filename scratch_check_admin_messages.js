import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('c:/Users/radhamay_ratanA/Desktop/Github-Wise/DJRATAN/emp-technoml/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}\\s*=\\s*(.*)$`, 'm'));
  if (match) {
    let val = match[1].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    return val;
  }
  return null;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log("Logging in as company user/admin...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ratanprajapati12421@gmail.com',
    password: 'Google@123456@',
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
  });

  const companyId = 'a4dce0e6-f11e-4054-9b55-4b94f7f5143b';
  const userId = authData.user.id;

  console.log("User email:", authData.user.email);
  console.log("User ID:", userId);

  console.log("\n1. Testing SELECT from admin_messages...");
  const { data: selectData, error: selectErr } = await client
    .from('admin_messages')
    .select('*')
    .limit(5);

  if (selectErr) {
    console.error("SELECT Error:", selectErr.message);
  } else {
    console.log("SELECT success:", selectData);
  }

  console.log("\n2. Testing INSERT into admin_messages...");
  const { data: insertData, error: insertErr } = await client
    .from('admin_messages')
    .insert({
      company_id: companyId,
      sender_id: userId,
      receiver_id: userId, // message to self or another
      body: 'Test policy msg',
      is_broadcast: false,
      message_type: 'general',
      disable_replies: false,
      require_acknowledgement: false
    })
    .select();

  if (insertErr) {
    console.error("INSERT Error:", insertErr.message);
  } else {
    console.log("INSERT success:", insertData);
  }

  // If insert worked, let's try updating it
  if (insertData && insertData.length > 0) {
    const msgId = insertData[0].id;
    console.log("\n3. Testing UPDATE of admin_messages...");
    const { data: updateData, error: updateErr } = await client
      .from('admin_messages')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', msgId)
      .select();

    if (updateErr) {
      console.error("UPDATE Error:", updateErr.message);
    } else {
      console.log("UPDATE success:", updateData);
    }
  }
}

run();
