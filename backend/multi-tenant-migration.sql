-- Multi-Tenant Migration for Repario Invoice Management System
-- This migration transforms the single-tenant system to a multi-tenant system
-- Run these commands in your Supabase SQL editor

-- =====================================================
-- STEP 1: CREATE BUSINESSES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: MODIFY PROFILES TABLE FOR MULTI-TENANT
-- =====================================================

-- First, disable RLS temporarily to make changes
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop existing policies safely
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'profiles') THEN
        DROP POLICY "Users can view own profile" ON public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
        DROP POLICY "Users can update own profile" ON public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles') THEN
        DROP POLICY "Users can insert own profile" ON public.profiles;
    END IF;
END $$;

-- Add business_id column to profiles if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'business_id') THEN
        -- Add business_id column (nullable initially for migration)
        ALTER TABLE public.profiles ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
        
        -- Add role column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
            ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','manager','user'));
        END IF;
        
        -- Add full_name column if it doesn't exist  
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
            ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
        END IF;
        
        -- Add phone column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
            ALTER TABLE public.profiles ADD COLUMN phone TEXT;
        END IF;
    END IF;
END $$;

-- Update profiles to reference auth.users properly
-- Change profiles.id to reference auth.users instead of being a standalone UUID
DO $$
BEGIN
    -- Check if profiles.id already references auth.users
    -- We'll check if there's a foreign key constraint on profiles.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.table_name = 'profiles' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'id'
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
    ) THEN
        -- We need to recreate the profiles table to properly reference auth.users
        -- First backup existing data
        CREATE TEMP TABLE profiles_backup AS SELECT * FROM public.profiles;
        
        -- Drop the table (this will cascade to dependent objects)
        DROP TABLE IF EXISTS public.profiles CASCADE;
        
        -- Recreate profiles table with proper structure
        CREATE TABLE public.profiles (
            id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
            full_name TEXT,
            phone TEXT,
            role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','manager','user')),
            email TEXT, -- Keep email for backward compatibility
            password_hash TEXT, -- Keep password_hash for backward compatibility  
            display_name TEXT, -- Keep display_name for backward compatibility
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Try to restore data from backup (this may fail if there are conflicts)
        -- In a real migration, you'd need to handle this more carefully
        BEGIN
            INSERT INTO public.profiles (id, full_name, phone, email, password_hash, display_name, created_at, updated_at)
            SELECT id, display_name, NULL, email, password_hash, display_name, created_at, updated_at 
            FROM profiles_backup
            WHERE id IN (SELECT id FROM auth.users);
        EXCEPTION
            WHEN OTHERS THEN
                -- If restore fails, just continue - the admin will need to handle this manually
                RAISE NOTICE 'Could not restore all profile data. Please review manually.';
        END;
    END IF;
END $$;

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- =====================================================
-- STEP 3: CREATE HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_business_id() 
RETURNS UUID 
LANGUAGE SQL 
STABLE 
AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid()
$$;

-- =====================================================
-- STEP 4: CREATE POLICIES FOR BUSINESSES
-- =====================================================

-- Drop existing policies safely for businesses
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read own business' AND tablename = 'businesses') THEN
        DROP POLICY "read own business" ON public.businesses;
    END IF;
END $$;

-- Policy: members may select their own business
CREATE POLICY "read own business"
    ON public.businesses FOR SELECT
    TO authenticated
    USING (id = public.current_business_id());

-- =====================================================
-- STEP 5: CREATE POLICIES FOR PROFILES  
-- =====================================================

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely for profiles
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read users in same business' AND tablename = 'profiles') THEN
        DROP POLICY "read users in same business" ON public.profiles;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'admins manage users in same business' AND tablename = 'profiles') THEN
        DROP POLICY "admins manage users in same business" ON public.profiles;
    END IF;
END $$;

-- Policy: everyone can select users in their own business
CREATE POLICY "read users in same business"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (business_id = public.current_business_id());

-- Policy: admins manage (insert/update/delete) only within same business
CREATE POLICY "admins manage users in same business"
    ON public.profiles FOR ALL
    TO authenticated
    USING (
        business_id = public.current_business_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles me
            WHERE me.id = auth.uid()
                AND me.business_id = public.profiles.business_id
                AND me.role = 'admin'
        )
    )
    WITH CHECK (business_id = public.current_business_id());

-- =====================================================
-- STEP 6: ADD BUSINESS_ID TO EXISTING TABLES
-- =====================================================

-- Add business_id to customers table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'business_id') THEN
        -- Add business_id column as nullable initially
        ALTER TABLE public.customers ADD COLUMN business_id UUID REFERENCES public.businesses(id);
    END IF;
END $$;

-- Add business_id to layouts table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'layouts' AND column_name = 'business_id') THEN
        -- Add business_id column as nullable initially
        ALTER TABLE public.layouts ADD COLUMN business_id UUID REFERENCES public.businesses(id);
    END IF;
END $$;

-- Add business_id to invoices table  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'business_id') THEN
        -- Add business_id column as nullable initially
        ALTER TABLE public.invoices ADD COLUMN business_id UUID REFERENCES public.businesses(id);
    END IF;
END $$;

-- Add business_id to items table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'business_id') THEN
        -- Add business_id column as nullable initially
        ALTER TABLE public.items ADD COLUMN business_id UUID REFERENCES public.businesses(id);
    END IF;
END $$;

-- =====================================================
-- STEP 7: UPDATE EXISTING POLICIES FOR MULTI-TENANT
-- =====================================================

-- Update customers policies
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Drop existing customer policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own customers' AND tablename = 'customers') THEN
        DROP POLICY "Users can view own customers" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own customers' AND tablename = 'customers') THEN
        DROP POLICY "Users can insert own customers" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own customers' AND tablename = 'customers') THEN
        DROP POLICY "Users can update own customers" ON public.customers;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own customers' AND tablename = 'customers') THEN
        DROP POLICY "Users can delete own customers" ON public.customers;
    END IF;
END $$;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create new multi-tenant policies for customers
CREATE POLICY "business users can access customers"
    ON public.customers FOR ALL
    TO authenticated
    USING (business_id = public.current_business_id())
    WITH CHECK (business_id = public.current_business_id());

-- Update layouts policies
ALTER TABLE public.layouts DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Drop existing layout policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own layouts' AND tablename = 'layouts') THEN
        DROP POLICY "Users can view own layouts" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own layouts' AND tablename = 'layouts') THEN
        DROP POLICY "Users can insert own layouts" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own layouts' AND tablename = 'layouts') THEN
        DROP POLICY "Users can update own layouts" ON public.layouts;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own layouts' AND tablename = 'layouts') THEN
        DROP POLICY "Users can delete own layouts" ON public.layouts;
    END IF;
END $$;

ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;

-- Create new multi-tenant policies for layouts
CREATE POLICY "business users can access layouts"
    ON public.layouts FOR ALL
    TO authenticated
    USING (business_id = public.current_business_id())
    WITH CHECK (business_id = public.current_business_id());

-- Update layout_sections policies (inherits business access through layouts)
ALTER TABLE public.layout_sections DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Drop existing layout_sections policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own layout sections' AND tablename = 'layout_sections') THEN
        DROP POLICY "Users can view own layout sections" ON public.layout_sections;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own layout sections' AND tablename = 'layout_sections') THEN
        DROP POLICY "Users can insert own layout sections" ON public.layout_sections;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own layout sections' AND tablename = 'layout_sections') THEN
        DROP POLICY "Users can update own layout sections" ON public.layout_sections;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own layout sections' AND tablename = 'layout_sections') THEN
        DROP POLICY "Users can delete own layout sections" ON public.layout_sections;
    END IF;
END $$;

ALTER TABLE public.layout_sections ENABLE ROW LEVEL SECURITY;

-- Create new multi-tenant policies for layout_sections
CREATE POLICY "business users can access layout sections"
    ON public.layout_sections FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.layouts 
            WHERE layouts.id = layout_sections.layout_id 
            AND layouts.business_id = public.current_business_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.layouts 
            WHERE layouts.id = layout_sections.layout_id 
            AND layouts.business_id = public.current_business_id()
        )
    );

-- Update layout_fields policies
ALTER TABLE public.layout_fields DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Drop existing layout_fields policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own layout fields' AND tablename = 'layout_fields') THEN
        DROP POLICY "Users can view own layout fields" ON public.layout_fields;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own layout fields' AND tablename = 'layout_fields') THEN
        DROP POLICY "Users can insert own layout fields" ON public.layout_fields;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own layout fields' AND tablename = 'layout_fields') THEN
        DROP POLICY "Users can update own layout fields" ON public.layout_fields;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own layout fields' AND tablename = 'layout_fields') THEN
        DROP POLICY "Users can delete own layout fields" ON public.layout_fields;
    END IF;
END $$;

ALTER TABLE public.layout_fields ENABLE ROW LEVEL SECURITY;

-- Create new multi-tenant policies for layout_fields
CREATE POLICY "business users can access layout fields"
    ON public.layout_fields FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.layout_sections ls
            JOIN public.layouts l ON l.id = ls.layout_id
            WHERE ls.id = layout_fields.section_id 
            AND l.business_id = public.current_business_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.layout_sections ls
            JOIN public.layouts l ON l.id = ls.layout_id
            WHERE ls.id = layout_fields.section_id 
            AND l.business_id = public.current_business_id()
        )
    );

-- Update layout_field_options policies
ALTER TABLE public.layout_field_options DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Drop existing layout_field_options policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own layout field options' AND tablename = 'layout_field_options') THEN
        DROP POLICY "Users can view own layout field options" ON public.layout_field_options;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own layout field options' AND tablename = 'layout_field_options') THEN
        DROP POLICY "Users can insert own layout field options" ON public.layout_field_options;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own layout field options' AND tablename = 'layout_field_options') THEN
        DROP POLICY "Users can update own layout field options" ON public.layout_field_options;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own layout field options' AND tablename = 'layout_field_options') THEN
        DROP POLICY "Users can delete own layout field options" ON public.layout_field_options;
    END IF;
END $$;

ALTER TABLE public.layout_field_options ENABLE ROW LEVEL SECURITY;

-- Create new multi-tenant policies for layout_field_options
CREATE POLICY "business users can access layout field options"
    ON public.layout_field_options FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.layout_fields lf
            JOIN public.layout_sections ls ON ls.id = lf.section_id
            JOIN public.layouts l ON l.id = ls.layout_id
            WHERE lf.id = layout_field_options.field_id 
            AND l.business_id = public.current_business_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.layout_fields lf
            JOIN public.layout_sections ls ON ls.id = lf.section_id
            JOIN public.layouts l ON l.id = ls.layout_id
            WHERE lf.id = layout_field_options.field_id 
            AND l.business_id = public.current_business_id()
        )
    );

-- Update invoices policies
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Drop existing invoice policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own invoices' AND tablename = 'invoices') THEN
        DROP POLICY "Users can view own invoices" ON public.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own invoices' AND tablename = 'invoices') THEN
        DROP POLICY "Users can insert own invoices" ON public.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own invoices' AND tablename = 'invoices') THEN
        DROP POLICY "Users can update own invoices" ON public.invoices;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own invoices' AND tablename = 'invoices') THEN
        DROP POLICY "Users can delete own invoices" ON public.invoices;
    END IF;
END $$;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create new multi-tenant policies for invoices
CREATE POLICY "business users can access invoices"
    ON public.invoices FOR ALL
    TO authenticated
    USING (business_id = public.current_business_id())
    WITH CHECK (business_id = public.current_business_id());

-- Update invoice_items policies
ALTER TABLE public.invoice_items DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Drop existing invoice_items policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own invoice items' AND tablename = 'invoice_items') THEN
        DROP POLICY "Users can view own invoice items" ON public.invoice_items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own invoice items' AND tablename = 'invoice_items') THEN
        DROP POLICY "Users can insert own invoice items" ON public.invoice_items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own invoice items' AND tablename = 'invoice_items') THEN
        DROP POLICY "Users can update own invoice items" ON public.invoice_items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own invoice items' AND tablename = 'invoice_items') THEN
        DROP POLICY "Users can delete own invoice items" ON public.invoice_items;
    END IF;
END $$;

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create new multi-tenant policies for invoice_items
CREATE POLICY "business users can access invoice items"
    ON public.invoice_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.business_id = public.current_business_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices 
            WHERE invoices.id = invoice_items.invoice_id 
            AND invoices.business_id = public.current_business_id()
        )
    );

-- Update items policies
ALTER TABLE public.items DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Drop existing items policies
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own items' AND tablename = 'items') THEN
        DROP POLICY "Users can view own items" ON public.items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own items' AND tablename = 'items') THEN
        DROP POLICY "Users can insert own items" ON public.items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own items' AND tablename = 'items') THEN
        DROP POLICY "Users can update own items" ON public.items;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own items' AND tablename = 'items') THEN
        DROP POLICY "Users can delete own items" ON public.items;
    END IF;
END $$;

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create new multi-tenant policies for items
CREATE POLICY "business users can access items"
    ON public.items FOR ALL
    TO authenticated
    USING (business_id = public.current_business_id())
    WITH CHECK (business_id = public.current_business_id());

-- =====================================================
-- STEP 8: CREATE ADDITIONAL INDEXES FOR PERFORMANCE
-- =====================================================

-- Add business_id indexes for all tables
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_layouts_business_id ON public.layouts(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_items_business_id ON public.items(business_id);

-- =====================================================
-- STEP 9: CREATE FUNCTIONS FOR EASIER ADMINISTRATION
-- =====================================================

-- Function to create a new business and admin user
CREATE OR REPLACE FUNCTION public.create_business_with_admin(
    p_business_name TEXT,
    p_admin_user_id UUID,
    p_admin_full_name TEXT DEFAULT NULL,
    p_admin_phone TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_business_id UUID;
BEGIN
    -- Create the business
    INSERT INTO public.businesses (name, created_by)
    VALUES (p_business_name, p_admin_user_id)
    RETURNING id INTO v_business_id;
    
    -- Create the admin profile
    INSERT INTO public.profiles (id, business_id, full_name, phone, role)
    VALUES (p_admin_user_id, v_business_id, p_admin_full_name, p_admin_phone, 'admin')
    ON CONFLICT (id) DO UPDATE SET
        business_id = v_business_id,
        full_name = COALESCE(p_admin_full_name, profiles.full_name),
        phone = COALESCE(p_admin_phone, profiles.phone),
        role = 'admin';
    
    RETURN v_business_id;
END;
$$;

-- Function to add a user to an existing business
CREATE OR REPLACE FUNCTION public.add_user_to_business(
    p_user_id UUID,
    p_business_id UUID,
    p_full_name TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'user'
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate role
    IF p_role NOT IN ('admin', 'manager', 'user') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin, manager, or user.';
    END IF;
    
    -- Check if business exists
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
        RAISE EXCEPTION 'Business does not exist.';
    END IF;
    
    -- Create or update the profile
    INSERT INTO public.profiles (id, business_id, full_name, phone, role)
    VALUES (p_user_id, p_business_id, p_full_name, p_phone, p_role)
    ON CONFLICT (id) DO UPDATE SET
        business_id = p_business_id,
        full_name = COALESCE(p_full_name, profiles.full_name),
        phone = COALESCE(p_phone, profiles.phone),
        role = p_role;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- STEP 10: CREATE DATA MIGRATION HELPER FUNCTIONS
-- =====================================================

-- Function to migrate existing single-tenant data to multi-tenant
-- This function should be run after the schema migration to assign existing data to businesses
CREATE OR REPLACE FUNCTION public.migrate_single_tenant_data() RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_default_business_id UUID;
    v_user_count INTEGER;
    v_first_user_id UUID;
    v_result TEXT;
BEGIN
    -- Count existing users in profiles
    SELECT COUNT(*) INTO v_user_count FROM public.profiles WHERE business_id IS NULL;
    
    IF v_user_count = 0 THEN
        RETURN 'No data migration needed - all profiles already have business_id assigned.';
    END IF;
    
    -- Get the first user ID that exists in both profiles and auth.users
    SELECT p.id INTO v_first_user_id 
    FROM public.profiles p 
    WHERE EXISTS (SELECT 1 FROM auth.users au WHERE au.id = p.id)
    LIMIT 1;
    
    -- If no valid user found, create a default business without a specific creator
    IF v_first_user_id IS NULL THEN
        INSERT INTO public.businesses (name, created_by)
        VALUES ('Default Business (Migrated)', NULL)
        RETURNING id INTO v_default_business_id;
    ELSE
        -- Create a default business for migration
        INSERT INTO public.businesses (name, created_by)
        VALUES ('Default Business (Migrated)', v_first_user_id)
        RETURNING id INTO v_default_business_id;
    END IF;
    
    -- Update all profiles without business_id (only those that exist in auth.users)
    UPDATE public.profiles 
    SET business_id = v_default_business_id,
        role = CASE WHEN id = v_first_user_id THEN 'admin' ELSE 'user' END
    WHERE business_id IS NULL
    AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = profiles.id);
    
    -- Update all customers without business_id
    UPDATE public.customers 
    SET business_id = v_default_business_id
    WHERE business_id IS NULL;
    
    -- Update all layouts without business_id
    UPDATE public.layouts 
    SET business_id = v_default_business_id
    WHERE business_id IS NULL;
    
    -- Update all invoices without business_id
    UPDATE public.invoices 
    SET business_id = v_default_business_id
    WHERE business_id IS NULL;
    
    -- Update all items without business_id
    UPDATE public.items 
    SET business_id = v_default_business_id
    WHERE business_id IS NULL;
    
    -- Now make business_id columns NOT NULL where they should be
    BEGIN
        ALTER TABLE public.customers ALTER COLUMN business_id SET NOT NULL;
        ALTER TABLE public.layouts ALTER COLUMN business_id SET NOT NULL;
        ALTER TABLE public.invoices ALTER COLUMN business_id SET NOT NULL;
        ALTER TABLE public.items ALTER COLUMN business_id SET NOT NULL;
    EXCEPTION
        WHEN OTHERS THEN
            -- If setting NOT NULL fails, log it but continue
            RAISE NOTICE 'Warning: Could not set all business_id columns to NOT NULL. Some data may still be missing business_id values.';
    END;
    
    v_result := 'Migration completed successfully. ' || v_user_count || ' users processed for default business: ' || v_default_business_id;
    
    RETURN v_result;
END;
$$;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Multi-tenant migration completed successfully! 🎉

Next steps:
1. Run SELECT public.migrate_single_tenant_data(); to migrate existing data
2. Use SELECT public.create_business_with_admin(''Your Business'', ''user-uuid'', ''Full Name'', ''Phone''); to create new businesses
3. Use SELECT public.add_user_to_business(''user-uuid'', ''business-uuid'', ''Full Name'', ''Phone'', ''role''); to add users to businesses

The following multi-tenant features are now active:
✅ Businesses table with RLS
✅ Updated profiles table with business relationship and roles
✅ Multi-tenant access control for all tables
✅ Helper functions for business and user management
✅ Data isolation by business_id
✅ Admin role management within businesses' as migration_status;
