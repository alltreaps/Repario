-- Repario Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create profiles table (users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    company TEXT,
    tax_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create layouts table
CREATE TABLE IF NOT EXISTS layouts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create layout_sections table
CREATE TABLE IF NOT EXISTS layout_sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create layout_fields table
CREATE TABLE IF NOT EXISTS layout_fields (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    section_id UUID REFERENCES layout_sections(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'email', 'phone', 'textarea', 'select', 'checkbox')),
    label TEXT NOT NULL,
    placeholder TEXT,
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    validation_rules TEXT, -- JSON string for validation rules
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create layout_field_options table (for select fields)
CREATE TABLE IF NOT EXISTS layout_field_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    field_id UUID REFERENCES layout_fields(id) ON DELETE CASCADE,
    option_value TEXT NOT NULL,
    option_label TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    terms TEXT,
    custom_fields JSONB, -- Store dynamic layout field values
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, invoice_number)
);

-- 8. Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) DEFAULT 0.00,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_layouts_user_id ON layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_layout_sections_layout_id ON layout_sections(layout_id);
CREATE INDEX IF NOT EXISTS idx_layout_fields_section_id ON layout_fields(section_id);
CREATE INDEX IF NOT EXISTS idx_layout_field_options_field_id ON layout_field_options(field_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_layouts_updated_at BEFORE UPDATE ON layouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_layout_sections_updated_at BEFORE UPDATE ON layout_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_layout_fields_updated_at BEFORE UPDATE ON layout_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE layout_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE layout_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE layout_field_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid()::uuid);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid()::uuid);

-- Customers: Users can only access their own customers
CREATE POLICY "Users can view own customers" ON customers FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can insert own customers" ON customers FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own customers" ON customers FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can delete own customers" ON customers FOR DELETE USING (user_id = auth.uid()::uuid);

-- Layouts: Users can only access their own layouts
CREATE POLICY "Users can view own layouts" ON layouts FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can insert own layouts" ON layouts FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own layouts" ON layouts FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can delete own layouts" ON layouts FOR DELETE USING (user_id = auth.uid()::uuid);

-- Layout sections: Users can only access sections of their own layouts
CREATE POLICY "Users can view own layout sections" ON layout_sections FOR SELECT USING (
    layout_id IN (SELECT id FROM layouts WHERE user_id = auth.uid()::uuid)
);
CREATE POLICY "Users can insert own layout sections" ON layout_sections FOR INSERT WITH CHECK (
    layout_id IN (SELECT id FROM layouts WHERE user_id = auth.uid()::uuid)
);
CREATE POLICY "Users can update own layout sections" ON layout_sections FOR UPDATE USING (
    layout_id IN (SELECT id FROM layouts WHERE user_id = auth.uid()::uuid)
);
CREATE POLICY "Users can delete own layout sections" ON layout_sections FOR DELETE USING (
    layout_id IN (SELECT id FROM layouts WHERE user_id = auth.uid()::uuid)
);

-- Layout fields: Users can only access fields of their own layout sections
CREATE POLICY "Users can view own layout fields" ON layout_fields FOR SELECT USING (
    section_id IN (
        SELECT ls.id FROM layout_sections ls
        JOIN layouts l ON ls.layout_id = l.id
        WHERE l.user_id = auth.uid()::uuid
    )
);
CREATE POLICY "Users can insert own layout fields" ON layout_fields FOR INSERT WITH CHECK (
    section_id IN (
        SELECT ls.id FROM layout_sections ls
        JOIN layouts l ON ls.layout_id = l.id
        WHERE l.user_id = auth.uid()::uuid
    )
);
CREATE POLICY "Users can update own layout fields" ON layout_fields FOR UPDATE USING (
    section_id IN (
        SELECT ls.id FROM layout_sections ls
        JOIN layouts l ON ls.layout_id = l.id
        WHERE l.user_id = auth.uid()::uuid
    )
);
CREATE POLICY "Users can delete own layout fields" ON layout_fields FOR DELETE USING (
    section_id IN (
        SELECT ls.id FROM layout_sections ls
        JOIN layouts l ON ls.layout_id = l.id
        WHERE l.user_id = auth.uid()::uuid
    )
);

-- Layout field options: Users can only access options of their own layout fields
CREATE POLICY "Users can view own layout field options" ON layout_field_options FOR SELECT USING (
    field_id IN (
        SELECT lf.id FROM layout_fields lf
        JOIN layout_sections ls ON lf.section_id = ls.id
        JOIN layouts l ON ls.layout_id = l.id
        WHERE l.user_id = auth.uid()::uuid
    )
);
CREATE POLICY "Users can insert own layout field options" ON layout_field_options FOR INSERT WITH CHECK (
    field_id IN (
        SELECT lf.id FROM layout_fields lf
        JOIN layout_sections ls ON lf.section_id = ls.id
        JOIN layouts l ON ls.layout_id = l.id
        WHERE l.user_id = auth.uid()::uuid
    )
);
CREATE POLICY "Users can update own layout field options" ON layout_field_options FOR UPDATE USING (
    field_id IN (
        SELECT lf.id FROM layout_fields lf
        JOIN layout_sections ls ON lf.section_id = ls.id
        JOIN layouts l ON ls.layout_id = l.id
        WHERE l.user_id = auth.uid()::uuid
    )
);
CREATE POLICY "Users can delete own layout field options" ON layout_field_options FOR DELETE USING (
    field_id IN (
        SELECT lf.id FROM layout_fields lf
        JOIN layout_sections ls ON lf.section_id = ls.id
        JOIN layouts l ON ls.layout_id = l.id
        WHERE l.user_id = auth.uid()::uuid
    )
);

-- Invoices: Users can only access their own invoices
CREATE POLICY "Users can view own invoices" ON invoices FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can insert own invoices" ON invoices FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own invoices" ON invoices FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can delete own invoices" ON invoices FOR DELETE USING (user_id = auth.uid()::uuid);

-- Invoice items: Users can only access items of their own invoices
CREATE POLICY "Users can view own invoice items" ON invoice_items FOR SELECT USING (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()::uuid)
);
CREATE POLICY "Users can insert own invoice items" ON invoice_items FOR INSERT WITH CHECK (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()::uuid)
);
CREATE POLICY "Users can update own invoice items" ON invoice_items FOR UPDATE USING (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()::uuid)
);
CREATE POLICY "Users can delete own invoice items" ON invoice_items FOR DELETE USING (
    invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid()::uuid)
);

-- Insert a default layout for testing (optional)
INSERT INTO layouts (user_id, name, description, is_default) VALUES 
('00000000-0000-0000-0000-000000000000', 'Default Invoice Layout', 'Standard invoice layout with basic fields', true)
ON CONFLICT DO NOTHING;

-- Notification
SELECT 'Repario database schema created successfully! 🎉' as status;
