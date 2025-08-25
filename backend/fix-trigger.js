const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixTrigger() {
  console.log('Creating exec_sql function...');
  
  // First, create the exec_sql function
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        result json;
    BEGIN
        EXECUTE sql;
        RETURN '{"status": "success"}'::json;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object('error', SQLERRM);
    END;
    $$;
  `;
  
  try {
    // We'll use a different approach - insert into a dummy table to execute SQL
    console.log('Dropping the trigger directly...');
    
    // Try to drop the trigger by attempting to insert and letting the error tell us if it worked
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        user_id: '83a7c220-2f96-47da-b131-c5be774b4afb',
        business_id: '55a768a8-2dec-4a42-973e-b647a67b57a5',
        customer_id: '01b838df-b971-4538-b4f7-c18bc530563a',
        layout_id: '93a50b34-b646-43f2-bad2-2389e265e693',
        form_data: {},
        subtotal: 22.00,
        tax_rate: 0.0000,
        tax_amount: 0.00,
        total_amount: 22.00,
        status: 'pending'
      })
      .select()
      .single();
      
    if (error) {
      console.error('Insert still failing with trigger:', error.message);
      
      // Let's try a manual approach
      console.log('Will need to remove trigger manually via Supabase dashboard...');
      console.log('Please go to Supabase Dashboard > SQL Editor and run:');
      console.log('DROP TRIGGER IF EXISTS auto_assign_business_id_invoices ON public.invoices;');
      
    } else {
      console.log('Invoice inserted successfully!', data);
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

fixTrigger();
