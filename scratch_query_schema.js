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

  console.log('Querying constraints from information_schema...');
  // PostgREST doesn't expose information_schema by default, but we can check if it works or fails
  const { data: constraints, error: err1 } = await authenticatedSupabase
    .from('admin_permissions')
    .select('*')
    .limit(1);
  
  if (err1) {
    console.error('Error fetching admin_permissions:', err1.message);
  } else {
    console.log('Fetched 1 permission record:', constraints);
  }
}

run();
