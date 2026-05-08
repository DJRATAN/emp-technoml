
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function createSuperAdmin() {
  const email = 'ratanprajapati1242@gmail.com';
  const password = 'Google@123456@';

  console.log(`Creating Super Admin: ${email}...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Super Admin' }
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log("User already exists, proceeding to promote...");
      // Get the user ID
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users.users.find(u => u.email === email);
      if (user) await promote(user.id);
    } else {
      console.error("Error creating user:", error.message);
    }
    return;
  }

  console.log("User created successfully!");
  await promote(data.user.id);
}

async function promote(userId) {
  console.log(`Promoting user ${userId} to super_admin...`);
  
  // Create profile
  const { error: pErr } = await supabase.from('profiles').upsert({
    id: userId,
    email: 'ratanprajapati1242@gmail.com',
    full_name: 'Super Admin',
    status: 'approved',
    is_active: true
  });
  if (pErr) console.error("Profile error:", pErr.message);

  // Add role
  const { error: rErr } = await supabase.from('user_roles').upsert({
    user_id: userId,
    role: 'super_admin'
  });
  
  if (rErr) {
    console.error("Role error:", rErr.message);
  } else {
    console.log("SUCCESS! User is now a Super Admin.");
  }
}

createSuperAdmin();
