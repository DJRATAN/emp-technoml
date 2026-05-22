import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file manually
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
    password: 'Google@123456@', // Let's check if they use this password
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Logged in user:", authData.user.email);

  const { data: feats, error: fErr } = await supabase
    .from('company_features')
    .select('*')
    .eq('company_id', 'a4dce0e6-f11e-4054-9b55-4b94f7f5143b')
    .maybeSingle();

  if (fErr) {
    console.error("Error fetching company_features:", fErr.message);
  } else {
    console.log("Fetched features for company:", feats);
  }
}

run();
