const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function fixRLSPolicies() {
  // Create admin client with service role
  const supabase = createClient(
    'https://dntblbqgplwegjnbyjey.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRudGJsYnFncGx3ZWdqbmJ5amV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MjExNywiZXhwIjoyMDcxMDI4MTE3fQ.FhXELdwxe4Y4ViW1O-8R38Su5r-hbgmvMuHlvMZ5ycg',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('🔧 Fixing RLS policy infinite recursion...');

  try {
    // Read and execute the fix SQL
    const fixSQL = fs.readFileSync(path.join(__dirname, 'fix-rls-policies.sql'), 'utf8');
    
    // Split into individual statements and execute
    const statements = fixSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          console.error(`❌ Error executing statement: ${error.message}`);
          console.error(`Statement: ${statement}`);
        } else {
          console.log(`✅ Success`);
        }
      }
    }

    console.log('🎉 RLS policies fixed!');

  } catch (error) {
    console.error('❌ Error reading SQL file:', error);
  }
}

fixRLSPolicies();
