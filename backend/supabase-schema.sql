-- Supabase SQL Schema for Repario Invoice Management System
-- Run these commands in your Supabase SQL editor

-- Enable RLS (Row Level Security) for all tables
-- This will be applied to each table individually

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies (users can only access their own profile)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (true); -- Allow registration

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Customers policies (users can only access their own customers)
DROP POLICY IF EXISTS "Users can view own customers" ON customers;
CREATE POLICY "Users can view own customers" ON customers
  FOR SELECT USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can insert own customers" ON customers;
CREATE POLICY "Users can insert own customers" ON customers
  FOR INSERT WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can update own customers" ON customers;
CREATE POLICY "Users can update own customers" ON customers
  FOR UPDATE USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can delete own customers" ON customers;
CREATE POLICY "Users can delete own customers" ON customers
  FOR DELETE USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- =====================================================
-- LAYOUTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

-- Layouts policies (users can only access their own layouts)
DROP POLICY IF EXISTS "Users can view own layouts" ON layouts;
CREATE POLICY "Users can view own layouts" ON layouts
  FOR SELECT USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can insert own layouts" ON layouts;
CREATE POLICY "Users can insert own layouts" ON layouts
  FOR INSERT WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can update own layouts" ON layouts;
CREATE POLICY "Users can update own layouts" ON layouts
  FOR UPDATE USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can delete own layouts" ON layouts;
CREATE POLICY "Users can delete own layouts" ON layouts
  FOR DELETE USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- =====================================================
-- LAYOUT_SECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS layout_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE layout_sections ENABLE ROW LEVEL SECURITY;

-- Layout sections policies (users can access sections for their own layouts)
DROP POLICY IF EXISTS "Users can view own layout sections" ON layout_sections;
CREATE POLICY "Users can view own layout sections" ON layout_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM layouts 
      WHERE layouts.id = layout_sections.layout_id 
      AND layouts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own layout sections" ON layout_sections;
CREATE POLICY "Users can insert own layout sections" ON layout_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM layouts 
      WHERE layouts.id = layout_sections.layout_id 
      AND layouts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own layout sections" ON layout_sections;
CREATE POLICY "Users can update own layout sections" ON layout_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM layouts 
      WHERE layouts.id = layout_sections.layout_id 
      AND layouts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own layout sections" ON layout_sections;
CREATE POLICY "Users can delete own layout sections" ON layout_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM layouts 
      WHERE layouts.id = layout_sections.layout_id 
      AND layouts.user_id = auth.uid()
    )
  );

-- =====================================================
-- LAYOUT_FIELDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS layout_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES layout_sections(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('input', 'description', 'dropdown', 'checkboxes', 'items')),
  placeholder TEXT,
  required BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE layout_fields ENABLE ROW LEVEL SECURITY;

-- Layout fields policies (users can access fields for their own layouts)
DROP POLICY IF EXISTS "Users can view own layout fields" ON layout_fields;
CREATE POLICY "Users can view own layout fields" ON layout_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM layout_sections ls
      JOIN layouts l ON l.id = ls.layout_id
      WHERE ls.id = layout_fields.section_id 
      AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own layout fields" ON layout_fields;
CREATE POLICY "Users can insert own layout fields" ON layout_fields
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM layout_sections ls
      JOIN layouts l ON l.id = ls.layout_id
      WHERE ls.id = layout_fields.section_id 
      AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own layout fields" ON layout_fields;
CREATE POLICY "Users can update own layout fields" ON layout_fields
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM layout_sections ls
      JOIN layouts l ON l.id = ls.layout_id
      WHERE ls.id = layout_fields.section_id 
      AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own layout fields" ON layout_fields;
CREATE POLICY "Users can delete own layout fields" ON layout_fields
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM layout_sections ls
      JOIN layouts l ON l.id = ls.layout_id
      WHERE ls.id = layout_fields.section_id 
      AND l.user_id = auth.uid()
    )
  );

-- =====================================================
-- LAYOUT_FIELD_OPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS layout_field_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID NOT NULL REFERENCES layout_fields(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE layout_field_options ENABLE ROW LEVEL SECURITY;

-- Layout field options policies (users can access options for their own layout fields)
DROP POLICY IF EXISTS "Users can view own layout field options" ON layout_field_options;
CREATE POLICY "Users can view own layout field options" ON layout_field_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM layout_fields lf
      JOIN layout_sections ls ON ls.id = lf.section_id
      JOIN layouts l ON l.id = ls.layout_id
      WHERE lf.id = layout_field_options.field_id 
      AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own layout field options" ON layout_field_options;
CREATE POLICY "Users can insert own layout field options" ON layout_field_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM layout_fields lf
      JOIN layout_sections ls ON ls.id = lf.section_id
      JOIN layouts l ON l.id = ls.layout_id
      WHERE lf.id = layout_field_options.field_id 
      AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own layout field options" ON layout_field_options;
CREATE POLICY "Users can update own layout field options" ON layout_field_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM layout_fields lf
      JOIN layout_sections ls ON ls.id = lf.section_id
      JOIN layouts l ON l.id = ls.layout_id
      WHERE lf.id = layout_field_options.field_id 
      AND l.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own layout field options" ON layout_field_options;
CREATE POLICY "Users can delete own layout field options" ON layout_field_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM layout_fields lf
      JOIN layout_sections ls ON ls.id = lf.section_id
      JOIN layouts l ON l.id = ls.layout_id
      WHERE lf.id = layout_field_options.field_id 
      AND l.user_id = auth.uid()
    )
  );

-- =====================================================
-- INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  layout_id UUID NOT NULL REFERENCES layouts(id) ON DELETE RESTRICT,
  form_data JSONB,
  totals JSONB NOT NULL DEFAULT '{"subtotal": 0, "tax_rate": 0, "tax": 0, "grand_total": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Invoices policies (users can only access their own invoices)
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
CREATE POLICY "Users can insert own invoices" ON invoices
  FOR INSERT WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
CREATE POLICY "Users can update own invoices" ON invoices
  FOR UPDATE USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
CREATE POLICY "Users can delete own invoices" ON invoices
  FOR DELETE USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- =====================================================
-- INVOICE_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Invoice items policies (users can access items for their own invoices)
DROP POLICY IF EXISTS "Users can view own invoice items" ON invoice_items;
CREATE POLICY "Users can view own invoice items" ON invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own invoice items" ON invoice_items;
CREATE POLICY "Users can insert own invoice items" ON invoice_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own invoice items" ON invoice_items;
CREATE POLICY "Users can update own invoice items" ON invoice_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own invoice items" ON invoice_items;
CREATE POLICY "Users can delete own invoice items" ON invoice_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_items.invoice_id 
      AND invoices.user_id = auth.uid()
    )
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_layouts_user_id ON layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_layouts_user_id_default ON layouts(user_id, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_layout_sections_layout_id ON layout_sections(layout_id);
CREATE INDEX IF NOT EXISTS idx_layout_fields_section_id ON layout_fields(section_id);
CREATE INDEX IF NOT EXISTS idx_layout_field_options_field_id ON layout_field_options(field_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_layouts_updated_at ON layouts;
CREATE TRIGGER update_layouts_updated_at BEFORE UPDATE ON layouts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================
-- Uncomment the following to insert sample data after setting up authentication

/*
-- Insert sample profile (replace with actual user ID from auth.users)
INSERT INTO profiles (id, display_name) VALUES 
  ('your-user-id-here', 'John Doe');

-- Insert sample customer
INSERT INTO customers (user_id, name, phone, address) VALUES 
  ('your-user-id-here', 'Acme Corporation', '+1 (555) 123-4567', '123 Business St, Suite 100, City, State 12345');

-- Insert sample layout
INSERT INTO layouts (user_id, name, is_default) VALUES 
  ('your-user-id-here', 'Standard Invoice', true);

-- Note: You'll need to get the layout ID and continue with sections/fields
*/
