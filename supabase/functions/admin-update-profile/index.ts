
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      throw new Error('Server configuration error');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (callerError || !caller) throw new Error('Invalid token')

    const body = await req.json()
    const { userId, action, payload } = body
    if (!userId || !action) throw new Error('Missing userId or action')

    // 1. Authorization Check
    // Check if caller is Super-Admin
    const { data: callerRoles } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', caller.id)
    const isSuperAdmin = callerRoles?.some(r => r.role === 'super_admin')

    if (!isSuperAdmin) {
      // Check if caller is Owner or Admin in the same company
      const { data: targetProfile } = await supabaseAdmin.from('profiles').select('company_id').eq('id', userId).single()
      const { data: callerProfile } = await supabaseAdmin.from('profiles').select('company_id').eq('id', caller.id).single()
      
      if (!targetProfile || !callerProfile || targetProfile.company_id !== callerProfile.company_id) {
        throw new Error('Forbidden: Cross-tenant access denied')
      }

      const isAdmin = callerRoles?.some(r => r.role === 'admin')
      if (!isAdmin) throw new Error('Forbidden: Admin access required')
    }

    // 2. Perform Action
    if (action === 'password') {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: payload.password })
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } 
    
    if (action === 'avatar') {
      // payload.file is base64 string
      const base64Data = payload.file.split(',')[1] || payload.file
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      const ext = payload.ext || 'jpg'
      const path = `${userId}/avatar_${Date.now()}.${ext}`

      const { error: upErr } = await supabaseAdmin.storage.from('avatars').upload(path, binaryData, { 
        contentType: `image/${ext}`,
        upsert: true 
      })
      if (upErr) throw upErr

      const { error: dbErr } = await supabaseAdmin.from('profiles').update({ avatar_url: path }).eq('id', userId)
      if (dbErr) throw dbErr

      return new Response(JSON.stringify({ success: true, path }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'document') {
      const base64Data = payload.file.split(',')[1] || payload.file
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      const path = `${userId}/${Date.now()}_${payload.fileName}`

      const { error: upErr } = await supabaseAdmin.storage.from('employee-documents').upload(path, binaryData, { 
        contentType: payload.contentType || 'application/octet-stream'
      })
      if (upErr) throw upErr

      const { error: dbErr } = await supabaseAdmin.from('employee_documents').insert({
        employee_id: userId,
        company_id: payload.companyId,
        document_type: payload.docType || 'other',
        file_name: payload.fileName,
        storage_path: path,
        uploaded_by: caller.id
      })
      if (dbErr) throw dbErr

      return new Response(JSON.stringify({ success: true, path }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    throw new Error('Invalid action')

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
