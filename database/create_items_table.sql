-- Create the items table for the Repario application
-- This table stores the master catalog of products/services that can be added to invoices

CREATE TABLE IF NOT EXISTS public.items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) NOT NULL DEFAULT 'each',
    sku VARCHAR(100),
    category VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON public.items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_items_updated_at 
    BEFORE UPDATE ON public.items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to ensure users can only access their own items
CREATE POLICY "Users can view their own items" ON public.items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items" ON public.items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON public.items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON public.items
    FOR DELETE USING (auth.uid() = user_id);

-- Insert some sample items for testing (optional)
-- You can remove this section if you don't want sample data
INSERT INTO public.items (user_id, name, description, unit_price, unit, sku, category) 
SELECT 
    auth.uid(),
    'Web Development Service',
    'Custom web development and programming services',
    75.00,
    'hour',
    'WEB-001',
    'Services'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, name, description, unit_price, unit, sku, category) 
SELECT 
    auth.uid(),
    'Consultation',
    'Technical consultation and project planning',
    100.00,
    'hour',
    'CONS-001',
    'Services'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, name, description, unit_price, unit, sku, category) 
SELECT 
    auth.uid(),
    'Website Hosting',
    'Monthly website hosting service',
    25.00,
    'month',
    'HOST-001',
    'Hosting'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;
