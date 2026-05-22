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

  // Let's query one record or fetch structure if possible
  const { data: att, error: attError } = await authenticatedSupabase
    .from('attendance')
    .select('*')
    .limit(1);

  console.log('Attendance record structure:', attError || att);

  const { data: mood, error: moodError } = await authenticatedSupabase
    .from('employee_moods')
    .select('*')
    .limit(1);

  console.log('Mood record structure:', moodError || mood);

  const { data: tickets, error: ticketsError } = await authenticatedSupabase
    .from('helpdesk_tickets')
    .select('*')
    .limit(1);

  console.log('Tickets record structure:', ticketsError || tickets);

  const { data: audit, error: auditError } = await authenticatedSupabase
    .from('audit_logs')
    .select('*')
    .limit(1);

  console.log('Audit record structure:', auditError || audit);
}

run();
