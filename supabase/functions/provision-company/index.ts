// Provision a new tenant company + its owner-admin user.
// Called from the Super Admin UI; only super_admins can invoke (verified via JWT).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Body {
  company: { name: string; slug: string };
  owner: { email: string; full_name: string; password: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', caller.id);
    if (!roles?.some((r) => r.role === 'super_admin')) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden — super admin only' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: Body = await req.json();
    const slug = body.company.slug.toLowerCase().trim();
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid slug. Use lowercase letters, numbers, dashes (2-40 chars).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (body.owner.password.length < 6) {
      return new Response(JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Create company
    const { data: company, error: cErr } = await admin.from('companies').insert({
      name: body.company.name.trim(),
      slug,
      status: 'active',
    }).select().single();
    if (cErr) throw new Error(`company: ${cErr.message}`);

    // 2. Create company_settings row
    const { error: sErr } = await admin.from('company_settings').insert({
      company_id: company.id,
      company_name: body.company.name.trim(),
    });
    if (sErr) throw new Error(`settings: ${sErr.message}`);

    // 3. Create owner auth user
    const { data: createdUser, error: uErr } = await admin.auth.admin.createUser({
      email: body.owner.email.trim(),
      password: body.owner.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.owner.full_name.trim(),
        company_id: company.id,
      },
    });
    if (uErr || !createdUser.user) {
      // Rollback company
      await admin.from('companies').delete().eq('id', company.id);
      throw new Error(`user: ${uErr?.message ?? 'unknown'}`);
    }
    const ownerId = createdUser.user.id;

    // 4. Insert profile (auto-trigger removed; we insert manually)
    const { error: pErr } = await admin.from('profiles').insert({
      id: ownerId,
      email: body.owner.email.trim(),
      full_name: body.owner.full_name.trim(),
      department: 'Management',
      job_title: 'Administrator',
      status: 'approved',
      company_id: company.id,
    });
    if (pErr) throw new Error(`profile: ${pErr.message}`);

    // 5. Assign admin role
    const { error: rErr } = await admin.from('user_roles').insert({ user_id: ownerId, role: 'admin' });
    if (rErr) throw new Error(`role: ${rErr.message}`);

    // 6. Set company owner
    await admin.from('companies').update({ owner_id: ownerId }).eq('id', company.id);

    return new Response(JSON.stringify({ success: true, company_id: company.id, owner_id: ownerId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
