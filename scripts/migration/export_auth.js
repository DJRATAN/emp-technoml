import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function exportUsers() {
  console.log('Fetching users from Supabase Auth...')
  
  const allUsers = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: page,
      perPage: perPage
    })

    if (error) {
      console.error('Error fetching users:', error.message)
      break
    }

    if (users.length === 0) break

    allUsers.push(...users)
    console.log(`Fetched ${allUsers.length} users...`)
    
    if (users.length < perPage) break
    page++
  }

  fs.writeFileSync('auth_users_backup.json', JSON.stringify(allUsers, null, 2))
  console.log('✅ Exported all users to auth_users_backup.json')
  console.log('NOTE: Password hashes are protected. To migrate users with passwords, you usually need a direct database migration of the auth.users table.')
}

exportUsers()
