// Bootstrap edge function — creates admin user and seeds demo data (idempotent)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'service@technoml.in';
const ADMIN_PASSWORD = 'TechnoML@2026';

const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'Operations'];
const TITLES = ['Software Engineer', 'UI Designer', 'Marketing Lead', 'Sales Executive', 'Ops Manager'];
const DEMO_EMPLOYEES = [
  { email: 'rahul.sharma@technoml.in', full_name: 'Rahul Sharma', phone: '+91 98765 43210' },
  { email: 'priya.patel@technoml.in',  full_name: 'Priya Patel',  phone: '+91 98765 43211' },
  { email: 'arjun.mehta@technoml.in',  full_name: 'Arjun Mehta',  phone: '+91 98765 43212' },
  { email: 'sneha.iyer@technoml.in',   full_name: 'Sneha Iyer',   phone: '+91 98765 43213' },
  { email: 'vikram.singh@technoml.in', full_name: 'Vikram Singh', phone: '+91 98765 43214' },
];
const DEMO_PASSWORD = 'Employee@2026';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const log: string[] = [];

    // Resolve TechnoML tenant
    const { data: company } = await supabase.from('companies').select('id').eq('slug', 'technoml').maybeSingle();
    if (!company) throw new Error('TechnoML company not found — run the migration first');
    const COMPANY_ID = company.id;

    // Helper: get or create user
    async function ensureUser(email: string, password: string, meta: Record<string, unknown>) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email === email);
      if (existing) {
        log.push(`exists: ${email}`);
        return existing.id;
      }
      const { data, error } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: meta,
      });
      if (error) throw new Error(`createUser ${email}: ${error.message}`);
      log.push(`created: ${email}`);
      return data.user.id;
    }

    async function ensureProfile(id: string, fields: Record<string, unknown>) {
      const { data: existing } = await supabase.from('profiles').select('id').eq('id', id).maybeSingle();
      if (existing) {
        await supabase.from('profiles').update(fields).eq('id', id);
      } else {
        await supabase.from('profiles').insert({ id, company_id: COMPANY_ID, ...fields });
      }
    }

    // 1. Admin
    const adminId = await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, {
      full_name: 'TechnoML Admin', department: 'Management', job_title: 'Administrator',
    });
    await ensureProfile(adminId, {
      email: ADMIN_EMAIL, full_name: 'TechnoML Admin', department: 'Management',
      job_title: 'Administrator', status: 'approved', company_id: COMPANY_ID,
    });
    await supabase.from('user_roles').upsert({ user_id: adminId, role: 'admin' }, { onConflict: 'user_id,role' });
    await supabase.from('user_roles').upsert({ user_id: adminId, role: 'super_admin' }, { onConflict: 'user_id,role' });
    await supabase.from('companies').update({ owner_id: adminId }).eq('id', COMPANY_ID);

    // 2. Demo employees
    const employeeIds: string[] = [];
    for (let i = 0; i < DEMO_EMPLOYEES.length; i++) {
      const emp = DEMO_EMPLOYEES[i];
      const id = await ensureUser(emp.email, DEMO_PASSWORD, {
        full_name: emp.full_name,
        phone: emp.phone,
        department: DEPARTMENTS[i],
        job_title: TITLES[i],
      });
      employeeIds.push(id);
      await ensureProfile(id, {
        email: emp.email, status: i < 4 ? 'approved' : 'pending', full_name: emp.full_name,
        phone: emp.phone, department: DEPARTMENTS[i], job_title: TITLES[i], company_id: COMPANY_ID,
      });
    }

    // 3. Seed tasks (only for approved employees)
    const { data: existingTasks } = await supabase.from('tasks').select('id').limit(1);
    if (!existingTasks || existingTasks.length === 0) {
      const today = new Date();
      const taskRows = [
        { title: 'Q4 Product Roadmap Review', description: 'Review and finalize the Q4 roadmap document', priority: 'high', status: 'in_progress', assigned_to: employeeIds[0] },
        { title: 'Redesign onboarding flow', description: 'New mockups for signup and first-run experience', priority: 'high', status: 'pending', assigned_to: employeeIds[1] },
        { title: 'Launch email campaign', description: 'Spring promo email campaign to existing customers', priority: 'medium', status: 'in_progress', assigned_to: employeeIds[2] },
        { title: 'Client demo preparation', description: 'Prepare slides and demo environment for Acme Corp', priority: 'high', status: 'pending', assigned_to: employeeIds[3] },
        { title: 'Update API documentation', description: 'Document new endpoints and update Postman collection', priority: 'medium', status: 'completed', assigned_to: employeeIds[0] },
        { title: 'Performance audit', description: 'Run Lighthouse audit on production', priority: 'low', status: 'pending', assigned_to: employeeIds[1] },
        { title: 'Customer feedback analysis', description: 'Analyze NPS responses from last quarter', priority: 'medium', status: 'in_progress', assigned_to: employeeIds[2] },
        { title: 'Office supply restock', description: 'Place order for stationery and pantry items', priority: 'low', status: 'completed', assigned_to: employeeIds[3] },
      ].map((t, idx) => ({
        ...t,
        company_id: COMPANY_ID,
        assigned_by: adminId,
        due_date: new Date(today.getTime() + (idx - 2) * 86400000).toISOString().split('T')[0],
        completed_at: t.status === 'completed' ? new Date().toISOString() : null,
      }));
      await supabase.from('tasks').insert(taskRows);
      log.push(`seeded ${taskRows.length} tasks`);
    }

    // 4. Seed leave requests
    const { data: existingLeave } = await supabase.from('leave_requests').select('id').limit(1);
    if (!existingLeave || existingLeave.length === 0) {
      const today = new Date();
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      const addDays = (n: number) => new Date(today.getTime() + n * 86400000);
      const leaveRows = [
        { company_id: COMPANY_ID, user_id: employeeIds[0], leave_type: 'casual', start_date: fmt(addDays(3)), end_date: fmt(addDays(4)), days: 2, reason: 'Family function', status: 'pending' },
        { company_id: COMPANY_ID, user_id: employeeIds[1], leave_type: 'sick', start_date: fmt(addDays(-5)), end_date: fmt(addDays(-4)), days: 2, reason: 'Fever and rest', status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString() },
        { company_id: COMPANY_ID, user_id: employeeIds[2], leave_type: 'annual', start_date: fmt(addDays(10)), end_date: fmt(addDays(14)), days: 5, reason: 'Annual vacation', status: 'pending' },
        { company_id: COMPANY_ID, user_id: employeeIds[3], leave_type: 'casual', start_date: fmt(addDays(-10)), end_date: fmt(addDays(-10)), days: 1, reason: 'Personal work', status: 'rejected', reviewed_by: adminId, reviewed_at: new Date().toISOString(), admin_notes: 'Project deadline that day' },
      ];
      await supabase.from('leave_requests').insert(leaveRows);
      log.push(`seeded ${leaveRows.length} leave requests`);
    }

    // 5. Seed last 7 days of attendance for first 4 (approved) employees
    const { data: existingAtt } = await supabase.from('attendance').select('id').limit(1);
    if (!existingAtt || existingAtt.length === 0) {
      const today = new Date();
      const attRows: any[] = [];
      for (let d = 1; d <= 7; d++) {
        const date = new Date(today.getTime() - d * 86400000);
        const dateStr = date.toISOString().split('T')[0];
        // Skip Sundays (weekday 0)
        if (date.getDay() === 0) continue;
        for (let i = 0; i < 4; i++) {
          const isLate = Math.random() < 0.15;
          const checkIn = new Date(date);
          checkIn.setHours(isLate ? 9 : 8, isLate ? 25 : 55 - Math.floor(Math.random() * 30), 0);
          const checkOut = new Date(date);
          checkOut.setHours(18, Math.floor(Math.random() * 30), 0);
          attRows.push({
            company_id: COMPANY_ID,
            user_id: employeeIds[i],
            date: dateStr,
            check_in: checkIn.toISOString(),
            check_out: checkOut.toISOString(),
            latitude: 26.3050 + (Math.random() - 0.5) * 0.001,
            longitude: 77.6160 + (Math.random() - 0.5) * 0.001,
            distance_m: Math.floor(Math.random() * 80),
            location_verified: true,
            status: isLate ? 'late' : 'present',
          });
        }
      }
      await supabase.from('attendance').insert(attRows);
      log.push(`seeded ${attRows.length} attendance rows`);
    }

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
