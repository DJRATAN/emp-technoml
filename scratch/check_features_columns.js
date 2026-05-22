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
  console.log('Logging in...');
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'gnome0259@gmail.com', password: 'Google@123456@'
  });
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } }
  });

  const columns = [
    'company_id',
    'tasks_enabled',
    'birthdays_enabled',
    'chat_enabled',
    'kudos_enabled',
    'helpdesk_enabled',
    'multi_level_approvals_enabled',
    'ai_analytics_enabled',
    'payroll_export_enabled',
    'ip_whitelist_enabled',
    'mock_gps_detection_enabled',
    'wellbeing_enabled',
    'updated_at'
  ];

  for (const col of columns) {
    console.log(`Checking column: ${col}...`);
    const { data, error } = await client
      .from('company_features')
      .select(col)
      .limit(1);
    if (error) {
      console.log(`❌ Column ${col} failed:`, error.message);
    } else {
      console.log(`✅ Column ${col} exists`);
    }
  }
}

run();
