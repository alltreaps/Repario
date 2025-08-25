const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://dntblbqgplwegjnbyjey.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRudGJsYnFncGx3ZWdqbmJ5amV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTQ1MjExNywiZXhwIjoyMDcxMDI4MTE3fQ.FhXELdwxe4Y4ViW1O-8R38Su5r-hbgmvMuHlvMZ5ycg'
);

async function setupTestLayout() {
  try {
    console.log('🔧 Setting up test layout...');
    
    const layoutId = '93a50b34-b646-43f2-bad2-2389e265e693';
    
    // Create the layout
    const { data: layout, error: layoutError } = await supabase
      .from('layouts')
      .insert([{
        id: layoutId,
        name: 'Test Layout',
        is_default: true,
        user_id: layoutId // Use the same UUID for user_id temporarily
      }])
      .select()
      .single();
    
    if (layoutError) {
      console.log('Layout error (might already exist):', layoutError.message);
    } else {
      console.log('✅ Layout created:', layout);
    }
    
    // Create a test section
    const { data: section, error: sectionError } = await supabase
      .from('layout_sections')
      .insert([{
        layout_id: layoutId,
        title: 'Basic Information',
        sort_order: 0
      }])
      .select()
      .single();
    
    if (sectionError) {
      console.log('Section error:', sectionError.message);
    } else {
      console.log('✅ Section created:', section);
      
      // Create a test field
      const { data: field, error: fieldError } = await supabase
        .from('layout_fields')
        .insert([{
          section_id: section.id,
          label: 'Invoice Title',
          type: 'input',
          placeholder: 'Enter invoice title',
          required: true,
          sort_order: 0
        }])
        .select()
        .single();
      
      if (fieldError) {
        console.log('Field error:', fieldError.message);
      } else {
        console.log('✅ Field created:', field);
      }
    }
    
    // Test the fetch function
    console.log('🔍 Testing fetch...');
    const { data: testLayout, error: fetchError } = await supabase
      .from('layouts')
      .select(`
        *,
        layout_sections (
          id,
          title,
          sort_order,
          layout_fields (
            id,
            label,
            type,
            placeholder,
            required,
            sort_order,
            layout_field_options (
              id,
              label,
              value,
              sort_order
            )
          )
        )
      `)
      .eq('id', layoutId)
      .single();
    
    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
    } else {
      console.log('✅ Layout fetched successfully:', testLayout);
    }
    
  } catch (err) {
    console.error('❌ Setup error:', err);
  }
}

setupTestLayout();
