-- Complete Database Setup for Repario Application
-- This script creates all missing tables and columns needed for the application to work properly

-- =====================================================
-- 1. ADD MISSING DESCRIPTION COLUMN TO LAYOUTS TABLE
-- =====================================================

-- Check if description column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'layouts' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.layouts ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to layouts table';
    ELSE
        RAISE NOTICE 'Description column already exists in layouts table';
    END IF;
END $$;

-- =====================================================
-- 2. CREATE THE MISSING ITEMS TABLE
-- =====================================================

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

-- Create indexes for better performance on items table
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(category);
CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_is_active ON public.items(is_active);
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);

-- =====================================================
-- 3. CREATE TRIGGERS AND FUNCTIONS
-- =====================================================

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on items table updates
DROP TRIGGER IF EXISTS update_items_updated_at ON public.items;
CREATE TRIGGER update_items_updated_at 
    BEFORE UPDATE ON public.items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY FOR ITEMS TABLE
-- =====================================================

-- Enable Row Level Security (RLS) on items table
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own items" ON public.items;
DROP POLICY IF EXISTS "Users can insert their own items" ON public.items;
DROP POLICY IF EXISTS "Users can update their own items" ON public.items;
DROP POLICY IF EXISTS "Users can delete their own items" ON public.items;

-- Create RLS policies to ensure users can only access their own items
CREATE POLICY "Users can view their own items" ON public.items
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items" ON public.items
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON public.items
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON public.items
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. VERIFY LAYOUTS TABLE HAS REQUIRED COLUMNS
-- =====================================================

-- Ensure layouts table has all required columns
DO $$ 
BEGIN
    -- Check for is_default column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'layouts' 
        AND column_name = 'is_default'
    ) THEN
        ALTER TABLE public.layouts ADD COLUMN is_default BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_default column to layouts table';
    END IF;

    -- Check for user_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'layouts' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.layouts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to layouts table';
    END IF;

    -- Check for created_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'layouts' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.layouts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column to layouts table';
    END IF;

    -- Check for updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'layouts' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.layouts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to layouts table';
    END IF;
END $$;

-- =====================================================
-- 6. INSERT SAMPLE DATA FOR TESTING (OPTIONAL)
-- =====================================================

-- Insert some sample items for testing (only if user is authenticated)
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
    'Technical Consultation',
    'Technical consultation and project planning sessions',
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
    'Monthly website hosting and maintenance service',
    25.00,
    'month',
    'HOST-001',
    'Hosting'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, name, description, unit_price, unit, sku, category) 
SELECT 
    auth.uid(),
    'Domain Registration',
    'Annual domain name registration service',
    15.00,
    'year',
    'DOM-001',
    'Hosting'
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Display table structures for verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('items', 'layouts')
ORDER BY table_name, ordinal_position;

-- Display RLS policies
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
WHERE schemaname = 'public' 
    AND tablename IN ('items', 'layouts');

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Database setup completed successfully!';
    RAISE NOTICE '📋 Tables verified: items, layouts';
    RAISE NOTICE '🔒 RLS policies applied';
    RAISE NOTICE '📊 Sample data inserted (if authenticated)';
END $$;
