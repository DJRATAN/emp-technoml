import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

// Connection string: postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
const CONNECTION_STRING = process.env.SUPABASE_DB_URL 

if (!CONNECTION_STRING) {
  console.error('Missing SUPABASE_DB_URL in .env')
  console.log('Format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres')
  process.exit(1)
}

const client = new Client({
  connectionString: CONNECTION_STRING,
})

async function exportTable(tableName) {
  console.log(`Exporting table: ${tableName}...`)
  const res = await client.query(`SELECT * FROM "${tableName}"`)
  
  const outputDir = path.join(process.cwd(), 'migration_db_export')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(
    path.join(outputDir, `${tableName}.json`),
    JSON.stringify(res.rows, null, 2)
  )
}

async function main() {
  try {
    await client.connect()
    console.log('Connected to database.')

    // Get all tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `)

    const tables = tablesRes.rows.map(r => r.table_name)
    console.log(`Found ${tables.length} tables.`)

    for (const table of tables) {
      await exportTable(table)
    }

    console.log('\n✅ All tables exported to ./migration_db_export/')
  } catch (err) {
    console.error('Migration error:', err.message)
  } finally {
    await client.end()
  }
}

main()
