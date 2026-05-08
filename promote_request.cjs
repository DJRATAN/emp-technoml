
const https = require('https');

const data = JSON.stringify({
  action: "run_sql",
  sql: "DO $$ DECLARE uid uuid; BEGIN SELECT id INTO uid FROM auth.users WHERE email = 'ratanprajapati1242@gmail.com'; IF uid IS NOT NULL THEN UPDATE public.profiles SET status = 'approved', is_active = true WHERE id = uid; INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'super_admin') ON CONFLICT (user_id, role) DO NOTHING; END IF; END $$;"
});

const options = {
  hostname: 'ppkxhswrvymyjrcyskmq.supabase.co',
  path: '/functions/v1/bootstrap-admin',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwa3hoc3dydnlteWpyY3lza21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODI0NzQsImV4cCI6MjA5MjI1ODQ3NH0.Zko0J2uJDbU8hNLQL61v3zhmjAnfHMjIZt64qZKlHRw',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let resData = '';
  res.on('data', (chunk) => { resData += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', resData);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
