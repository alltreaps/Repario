const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');
    
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'fix-layout-deletion.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    console.log(sql);
    
    // Split the SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
        console.log(`✅ Statement ${i + 1} completed`);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
  } catch (err) {
    console.error('💥 Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration();
