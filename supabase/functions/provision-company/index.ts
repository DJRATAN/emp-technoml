
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
    
    // 1. Verify Authentication
    const callerClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !caller) {
      console.error("Auth error:", authErr);
      return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    console.log("Request action:", body.action);

    // ---------------------------------------------------------
    // ACTION: Password Reset (Added as Workaround)
    // ---------------------------------------------------------
    if (body.action === 'password') {
      const { userId, newPassword } = body;
      console.log("Resetting password for:", userId);

      // Simple permission check: must be admin or super_admin
      const { data: roles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', caller.id);
      const isAuthorized = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');

      if (!isAuthorized) {
        return new Response(JSON.stringify({ success: false, error: 'Forbidden: Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
      if (resetErr) {
        console.error("Reset error:", resetErr);
        return new Response(JSON.stringify({ success: false, error: resetErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ---------------------------------------------------------
    // ACTION: Provision (Original behavior)
    // ---------------------------------------------------------
    // ... (keeping original provision code)
    if (body.action === 'provision' || !body.action) {
      const { company: compData, owner: ownerData } = body;
      const { data: roles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', caller.id);
      if (!roles?.some((r) => r.role === 'super_admin')) {
        return new Response(JSON.stringify({ success: false, error: 'Super Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: company, error: cErr } = await supabaseAdmin.from('companies').insert({
        name: compData.name.trim(), slug: compData.slug.toLowerCase().trim(), status: 'active',
      }).select().single();
      if (cErr) throw new Error(cErr.message);

      await supabaseAdmin.from('company_settings').insert({ company_id: company.id, company_name: compData.name.trim() });

      const { data: createdUser, error: uErr } = await supabaseAdmin.auth.admin.createUser({
        email: ownerData.email.trim(), password: ownerData.password, email_confirm: true,
        user_metadata: { full_name: ownerData.full_name.trim(), company_id: company.id },
      });
      if (uErr) throw new Error(uErr.message);

      const ownerId = createdUser.user.id;
      await supabaseAdmin.from('profiles').insert({
        id: ownerId, email: ownerData.email.trim(), full_name: ownerData.full_name.trim(),
        department: 'Management', job_title: 'Administrator', status: 'approved', company_id: company.id,
      });
      await supabaseAdmin.from('user_roles').insert({ user_id: ownerId, role: 'admin' });
      await supabaseAdmin.from('companies').update({ owner_id: ownerId }).eq('id', company.id);

      return new Response(JSON.stringify({ success: true, company_id: company.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error("Global error:", e.message);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
