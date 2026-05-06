
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();

    if (body.action === 'password') {
      const { userId, newPassword, adminId, companyId } = body;
      if (!userId || !newPassword) throw new Error('Missing data');

      const pass = String(newPassword).trim();
      if (pass.length < 6) throw new Error('Password must be at least 6 characters');

      // 1. Get user
      const { data: user, error: getErr } = await supabase.auth.admin.getUserById(userId);
      if (getErr || !user.user) throw new Error('User not found');

      // 2. Update password
      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, { 
        password: pass 
      });
      
      if (updateErr) {
        // Log failed reset
        if (adminId) {
          await supabase.from('password_reset_audit').insert({
            company_id: companyId || null,
            admin_id: adminId,
            target_user_id: userId,
            target_email: user.user.email || '',
            success: false,
            failure_reason: updateErr.message,
          });
        }
        throw updateErr;
      }

      // 3. Confirm and unlock separately
      await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
      
      await supabase.from('profiles').update({ 
        failed_login_count: 0, 
        locked_until: null,
        is_active: true,
        force_password_change: false
      } as any).eq('id', userId);

      // 4. Log successful reset
      if (adminId) {
        await supabase.from('password_reset_audit').insert({
          company_id: companyId || null,
          admin_id: adminId,
          target_user_id: userId,
          target_email: user.user.email || '',
          success: true,
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        email: user.user.email,
        message: `SUCCESS! Password for ${user.user.email} is now updated.`
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Bootstrap function active" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
