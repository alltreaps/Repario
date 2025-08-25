const { createClient } = require('@supabase/supabase-js');

// Direct query to check policies
const supabase = createClient(
  'https://dntblbqgplwegjnbyjey.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRudGJsYnFncGx3ZWdqbmJ5amV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDg4MDY3OCwiZXhwIjoyMDUwNDU2Njc4fQ.OZCJqhkKdZdmQnyOaTJjRSMShIf2LLjKZDWQgFf2SLs',
  { 
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  }
);

async function checkPolicies() {
  console.log('=== Checking RLS Policies ===');
  
  try {
    // Use raw SQL to check policies
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE tablename = 'profiles'
        ORDER BY policyname;
      `
    });
    
    if (error) {
      console.error('RPC Error:', error);
      
      // Try direct query approach
      const { data: directData, error: directError } = await supabase
        .from('information_schema.table_privileges')
        .select('*')
        .limit(5);
        
      console.log('Direct query test:', directData, directError);
      return;
    }
    
    console.log('Policies found:', data);
    
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkPolicies();
