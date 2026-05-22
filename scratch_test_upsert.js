import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function run() {
  console.log('Logging in as admin...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'gnome0259@gmail.com',
    password: 'Google@123456@',
  });

  if (authError) {
    console.error('Login failed:', authError.message);
    process.exit(1);
  }

  const authenticatedSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  const testRecord = {
    admin_id: 'c29b7852-55b3-4068-ab19-6cffbf2295db',
    company_id: 'a4dce0e6-f11e-4054-9b55-4b94f7f5143b',
    can_approve_leaves: true,
    can_manage_payroll: true,
    can_manage_settings: true,
    can_reset_passwords: true,
    can_view_chat_history: true
  };

  console.log('Testing upsert with onConflict: "admin_id"...');
  const res1 = await authenticatedSupabase.from('admin_permissions').upsert(testRecord, { onConflict: 'admin_id' });
  if (res1.error) {
    console.log('Result for "admin_id": ERROR:', res1.error.message);
  } else {
    console.log('Result for "admin_id": SUCCESS!');
  }

  console.log('Testing upsert with onConflict: "id"...');
  const res2 = await authenticatedSupabase.from('admin_permissions').upsert({ id: 'some-random-uuid', ...testRecord }, { onConflict: 'id' });
  if (res2.error) {
    console.log('Result for "id": ERROR:', res2.error.message);
  } else {
    console.log('Result for "id": SUCCESS!');
  }
}

run();
