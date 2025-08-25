-- Supabase Multi-Tenant SQL Schema for Repario Invoice Management System
-- Run these commands in your Supabase SQL editor
-- This is the complete multi-tenant schema - use this for new installations

-- =====================================================
-- BUSINESSES TABLE
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
-- PROFILES TABLE (Multi-Tenant)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','manager','user')),
    -- Legacy fields for backward compatibility
    email TEXT,
    password_hash TEXT,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.current_business_id() 
RETURNS UUID 
LANGUAGE SQL 
STABLE 
AS $$
  SELECT business_id FROM public.profiles WHERE id = auth.uid()
$$;

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- LAYOUTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_layouts_business_id ON public.layouts(business_id);
CREATE INDEX IF NOT EXISTS idx_layouts_user_id ON public.layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_layouts_user_id_default ON public.layouts(user_id, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.layouts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- LAYOUT_SECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.layout_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID NOT NULL REFERENCES public.layouts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_layout_sections_layout_id ON public.layout_sections(layout_id);

-- Enable RLS
ALTER TABLE public.layout_sections ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- LAYOUT_FIELDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.layout_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.layout_sections(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('input', 'description', 'dropdown', 'checkboxes', 'items')),
    placeholder TEXT,
    required BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_layout_fields_section_id ON public.layout_fields(section_id);

-- Enable RLS
ALTER TABLE public.layout_fields ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- LAYOUT_FIELD_OPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.layout_field_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES public.layout_fields(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_layout_field_options_field_id ON public.layout_field_options(field_id);

-- Enable RLS
ALTER TABLE public.layout_field_options ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INVOICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    layout_id UUID NOT NULL REFERENCES public.layouts(id) ON DELETE RESTRICT,
    form_data JSONB,
    totals JSONB NOT NULL DEFAULT '{"subtotal": 0, "tax_rate": 0, "tax": 0, "grand_total": 0}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INVOICE_ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Enable RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ITEMS TABLE (Product Catalog)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit TEXT DEFAULT 'each',
    sku TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_items_business_id ON public.items(business_id);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_name ON public.items(name);
CREATE INDEX IF NOT EXISTS idx_items_sku ON public.items(sku);
CREATE INDEX IF NOT EXISTS idx_items_active ON public.items(is_active);

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- BUSINESSES POLICIES
CREATE POLICY "read own business"
    ON public.businesses FOR SELECT
    TO authenticated
    USING (id = public.current_business_id());

-- PROFILES POLICIES
CREATE POLICY "read users in same business"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (business_id = public.current_business_id());

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

-- CUSTOMERS POLICIES
CREATE POLICY "business users can access customers"
    ON public.customers FOR ALL
    TO authenticated
    USING (business_id = public.current_business_id())
    WITH CHECK (business_id = public.current_business_id());

-- LAYOUTS POLICIES
CREATE POLICY "business users can access layouts"
    ON public.layouts FOR ALL
    TO authenticated
    USING (business_id = public.current_business_id())
    WITH CHECK (business_id = public.current_business_id());

-- LAYOUT_SECTIONS POLICIES
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

-- LAYOUT_FIELDS POLICIES
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

-- LAYOUT_FIELD_OPTIONS POLICIES
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

-- INVOICES POLICIES
CREATE POLICY "business users can access invoices"
    ON public.invoices FOR ALL
    TO authenticated
    USING (business_id = public.current_business_id())
    WITH CHECK (business_id = public.current_business_id());

-- INVOICE_ITEMS POLICIES
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

-- ITEMS POLICIES
CREATE POLICY "business users can access items"
    ON public.items FOR ALL
    TO authenticated
    USING (business_id = public.current_business_id())
    WITH CHECK (business_id = public.current_business_id());

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_layouts_updated_at BEFORE UPDATE ON public.layouts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS FOR BUSINESS MANAGEMENT
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
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Multi-tenant Supabase schema created successfully! 🎉

To get started:
1. Use SELECT public.create_business_with_admin(''Your Business'', ''user-uuid'', ''Full Name'', ''Phone''); to create your first business
2. Use SELECT public.add_user_to_business(''user-uuid'', ''business-uuid'', ''Full Name'', ''Phone'', ''role''); to add more users

Features enabled:
✅ Multi-tenant data isolation by business
✅ Role-based access control (admin/manager/user)
✅ Row Level Security (RLS) on all tables
✅ Helper functions for business management
✅ Complete invoice management system
✅ Product catalog with business isolation' as schema_status;
