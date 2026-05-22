import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('c:/Users/radhamay_ratanA/Desktop/Github-Wise/DJRATAN/emp-technoml/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}\\s*=\\s*(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^"|"$/g, '') : null;
};

const supabase = createClient(getEnvVar('VITE_SUPABASE_URL'), getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY'), {
  auth: { persistSession: false }
});

async function run() {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ratanprajapati12421@gmail.com',
    password: 'Google@123456@',
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    return;
  }

  console.log("Logged in as:", authData.user.email);

  const { data: companies, error: cErr } = await supabase.from('companies').select('*');
  if (cErr) {
    console.error("Error fetching companies:", cErr.message);
  } else {
    console.log("=== COMPANIES ===");
    companies.forEach(c => {
      console.log(`ID: ${c.id} | Name: ${c.name} | Slug: ${c.slug} | Plan: ${c.plan_type}`);
    });
  }

  const { data: features, error: fErr } = await supabase.from('company_features').select('*');
  if (fErr) {
    console.error("Error fetching company_features:", fErr.message);
  } else {
    console.log("\n=== COMPANY FEATURES ===");
    features.forEach(f => {
      console.log(JSON.stringify(f, null, 2));
    });
  }
}

run();
