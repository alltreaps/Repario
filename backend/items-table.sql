-- Create items table for product catalog
CREATE TABLE IF NOT EXISTS items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit TEXT DEFAULT 'each', -- Unit of measurement (each, hour, kg, etc.)
    sku TEXT, -- Stock Keeping Unit
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_active ON items(is_active);

-- Add updated_at trigger
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for items
CREATE POLICY "Users can view own items" ON items FOR SELECT USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can insert own items" ON items FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "Users can update own items" ON items FOR UPDATE USING (user_id = auth.uid()::uuid);
CREATE POLICY "Users can delete own items" ON items FOR DELETE USING (user_id = auth.uid()::uuid);

-- Insert some sample items (optional)
INSERT INTO items (user_id, name, description, unit_price, unit, category) VALUES 
('00000000-0000-0000-0000-000000000000', 'Web Development - Basic Package', 'Basic website development package', 500.00, 'project', 'Web Development'),
('00000000-0000-0000-0000-000000000000', 'Consulting Hour', 'Business consulting services', 150.00, 'hour', 'Consulting'),
('00000000-0000-0000-0000-000000000000', 'Logo Design', 'Custom logo design', 300.00, 'each', 'Design')
ON CONFLICT DO NOTHING;

SELECT 'Items table created successfully! 🎉' as status;
