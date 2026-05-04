import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.40.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get caller user from headers
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (callerError || !caller) throw new Error('Invalid token')

    // Parse request body
    const { targetUserId, newPassword } = await req.json()
    if (!targetUserId || !newPassword) throw new Error('Missing targetUserId or newPassword')

    // 1. Check if caller is Super-Admin
    const { data: callerRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
    
    const isSuperAdmin = callerRoles?.some(r => r.role === 'super_admin')

    // 2. If not Super-Admin, check if caller is the Owner of the target user's company
    if (!isSuperAdmin) {
      // Get target user's company
      const { data: targetProfile, error: targetError } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', targetUserId)
        .single()

      if (targetError || !targetProfile) throw new Error('Target user not found')

      // Check company ownership
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('owner_id')
        .eq('id', targetProfile.company_id)
        .single()

      if (companyError || !company) throw new Error('Company not found')

      if (company.owner_id !== caller.id) {
        throw new Error('Forbidden: Only Super-Admins or Company Owners can change passwords')
      }
    }

    // 3. Perform the update
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: error.message === 'Forbidden' ? 403 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
