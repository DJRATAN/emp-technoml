import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // Needs service role for storage access

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function downloadBucket(bucketName) {
  console.log(`\n--- Downloading Bucket: ${bucketName} ---`)
  const localDir = path.join(process.cwd(), 'migration_storage', bucketName)
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true })
  }

  const { data: files, error } = await supabase.storage.from(bucketName).list('', {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    console.error(`Error listing bucket ${bucketName}:`, error.message)
    return
  }

  for (const file of files) {
    if (file.name === '.emptyFolderPlaceholder') continue

    console.log(`Downloading: ${file.name}...`)
    const { data, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(file.name)

    if (downloadError) {
      console.error(`Error downloading ${file.name}:`, downloadError.message)
      continue
    }

    const buffer = Buffer.from(await data.arrayBuffer())
    fs.writeFileSync(path.join(localDir, file.name), buffer)
  }
}

async function main() {
  const { data: buckets, error } = await supabase.storage.listBuckets()

  if (error) {
    console.error('Error listing buckets:', error.message)
    return
  }

  for (const bucket of buckets) {
    await downloadBucket(bucket.name)
  }

  console.log('\n✅ All storage downloaded to ./migration_storage/')
}

main()
