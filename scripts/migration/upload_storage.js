import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

// IMPORTANT: Make sure your .env has the NEW project's credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const STORAGE_DIR = path.join(process.cwd(), 'migration_storage')

async function uploadFile(bucketName, filePath, fileName) {
  const fileBuffer = fs.readFileSync(filePath)
  
  console.log(`Uploading ${fileName} to ${bucketName}...`)
  const { error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      upsert: true
    })

  if (error) {
    console.error(`Error uploading ${fileName}:`, error.message)
  }
}

async function main() {
  if (!fs.existsSync(STORAGE_DIR)) {
    console.error(`Source directory ${STORAGE_DIR} not found. Run download_storage.js first.`)
    return
  }

  const buckets = fs.readdirSync(STORAGE_DIR)

  for (const bucketName of buckets) {
    const bucketPath = path.join(STORAGE_DIR, bucketName)
    if (!fs.statSync(bucketPath).isDirectory()) continue

    console.log(`\n--- Processing Bucket: ${bucketName} ---`)

    // Ensure bucket exists in new project
    const { data: bucketExists } = await supabase.storage.getBucket(bucketName)
    if (!bucketExists) {
      console.log(`Creating bucket ${bucketName}...`)
      await supabase.storage.createBucket(bucketName, { public: true })
    }

    const files = fs.readdirSync(bucketPath)
    for (const fileName of files) {
      const filePath = path.join(bucketPath, fileName)
      if (fs.statSync(filePath).isFile()) {
        await uploadFile(bucketName, filePath, fileName)
      }
    }
  }

  console.log('\n✅ All storage uploaded to the new project!')
}

main()
