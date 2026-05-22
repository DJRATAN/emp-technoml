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
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ratanprajapati12421@gmail.com',
    password: 'Google@123456@',
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    return;
  }

  const authenticatedSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
  });

  console.log('Fetching profiles...');
  const { data: profiles, error: profError } = await authenticatedSupabase
    .from('profiles')
    .select('id, email, full_name, company_id, status');

  if (profError) {
    console.error('Error fetching profiles:', profError.message);
  } else {
    console.log('Profiles:');
    profiles.forEach(p => {
      console.log(`- Name: ${p.full_name}, Email: ${p.email}, Status: ${p.status}, Company: ${p.company_id}`);
    });
  }

  console.log('Fetching admin_permissions...');
  const { data: perms, error: permsErr } = await authenticatedSupabase
    .from('admin_permissions')
    .select('*');

  if (permsErr) {
    console.error('Error fetching admin_permissions:', permsErr.message);
  } else {
    console.log('Admin Permissions:', perms);
  }
}

run();
