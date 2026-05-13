import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

// Connection string for the NEW database
const CONNECTION_STRING = process.env.SUPABASE_DB_URL 

if (!CONNECTION_STRING) {
  console.error('Missing SUPABASE_DB_URL in .env')
  console.log('Ensure this is the connection string for your NEW Supabase project.')
  process.exit(1)
}

const client = new Client({
  connectionString: CONNECTION_STRING,
})

const EXPORT_DIR = path.join(process.cwd(), 'migration_db_export')

async function importTable(tableName) {
  const filePath = path.join(EXPORT_DIR, `${tableName}.json`)
  if (!fs.existsSync(filePath)) return

  console.log(`\nImporting data for table: ${tableName}...`)
  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  if (rows.length === 0) {
    console.log(`Table ${tableName} is empty, skipping.`)
    return
  }

  // Clear existing data (optional, be careful)
  // await client.query(`TRUNCATE TABLE "${tableName}" CASCADE`)

  for (const row of rows) {
    const columns = Object.keys(row).map(c => `"${c}"`).join(', ')
    const values = Object.values(row)
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')

    try {
      await client.query(
        `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      )
    } catch (err) {
      console.error(`Error inserting row into ${tableName}:`, err.message)
    }
  }
  console.log(`✅ Finished ${tableName}`)
}

async function main() {
  if (!fs.existsSync(EXPORT_DIR)) {
    console.error(`Export directory ${EXPORT_DIR} not found. Run export_db_node.js first.`)
    return
  }

  try {
    await client.connect()
    console.log('Connected to NEW database.')

    const files = fs.readdirSync(EXPORT_DIR)
    const tables = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))

    console.log(`Found ${tables.length} tables to import.`)

    // Disable triggers/constraints temporarily if possible, 
    // but ON CONFLICT DO NOTHING is safer for a basic script.
    // A better way is to sort by dependencies, but we'll try sequential.
    
    for (const table of tables) {
      await importTable(table)
    }

    console.log('\n✅ Data import complete!')
  } catch (err) {
    console.error('Import error:', err.message)
  } finally {
    await client.end()
  }
}

main()
