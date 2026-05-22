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

  console.log('User ID:', authData.user.id);

  console.log('Fetching roles from user_roles...');
  const { data: roles, error: rolesError } = await authenticatedSupabase
    .from('user_roles')
    .select('*');

  if (rolesError) {
    console.error('Error fetching user_roles:', rolesError.message);
  } else {
    console.log('User Roles in database:', roles);
  }
  
  console.log('Fetching companies...');
  const { data: companies, error: companiesError } = await authenticatedSupabase
    .from('companies')
    .select('*');

  if (companiesError) {
    console.error('Error fetching companies:', companiesError.message);
  } else {
    console.log('Companies:', companies);
  }
}

run();
