-- =====================================================
-- SECURE TENANT ISOLATION FIX
-- =====================================================
-- This script fixes the security issue where business_id could be 
-- passed from client. Instead, business_id is now automatically 
-- assigned server-side using triggers.
-- =====================================================

-- Function to auto-assign business_id on INSERT
CREATE OR REPLACE FUNCTION public.auto_assign_business_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-assign business_id from current user's business
    NEW.business_id := public.current_business_id();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ADD TRIGGERS FOR AUTO-ASSIGNMENT
-- =====================================================

-- Items table trigger
DROP TRIGGER IF EXISTS auto_assign_business_id_items ON public.items;
CREATE TRIGGER auto_assign_business_id_items
    BEFORE INSERT ON public.items
    FOR EACH ROW EXECUTE FUNCTION public.auto_assign_business_id();

-- Customers table trigger  
DROP TRIGGER IF EXISTS auto_assign_business_id_customers ON public.customers;
CREATE TRIGGER auto_assign_business_id_customers
    BEFORE INSERT ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.auto_assign_business_id();

-- Invoices table trigger
DROP TRIGGER IF EXISTS auto_assign_business_id_invoices ON public.invoices;
CREATE TRIGGER auto_assign_business_id_invoices
    BEFORE INSERT ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.auto_assign_business_id();

-- Note: invoice_items doesn't need business_id column or trigger
-- It inherits business context through invoice_id -> invoices.business_id

-- Layouts table trigger
DROP TRIGGER IF EXISTS auto_assign_business_id_layouts ON public.layouts;
CREATE TRIGGER auto_assign_business_id_layouts
    BEFORE INSERT ON public.layouts
    FOR EACH ROW EXECUTE FUNCTION public.auto_assign_business_id();

-- Note: layout_sections doesn't need business_id column or trigger  
-- It inherits business context through layout_id -> layouts.business_id

-- Note: layout_fields doesn't need business_id column or trigger
-- It inherits business context through section_id -> layout_sections.layout_id -> layouts.business_id

-- =====================================================
-- UPDATE RLS POLICIES TO REMOVE BUSINESS_ID FROM WITH CHECK
-- =====================================================

-- ITEMS TABLE - Secure RLS policies
DROP POLICY IF EXISTS "write:same-biz:manager+" ON public.items;
DROP POLICY IF EXISTS "update:same-biz:manager+" ON public.items;

-- Write within business (manager+) - no business_id check needed as trigger assigns it
CREATE POLICY "write:same-biz:manager+" ON public.items FOR INSERT
TO authenticated WITH CHECK (public.is_manager());

-- Update within business (manager+) - business_id cannot be changed
CREATE POLICY "update:same-biz:manager+" ON public.items FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

-- CUSTOMERS TABLE - Secure RLS policies
DROP POLICY IF EXISTS "write:same-biz:manager+" ON public.customers;
DROP POLICY IF EXISTS "update:same-biz:manager+" ON public.customers;

CREATE POLICY "write:same-biz:manager+" ON public.customers FOR INSERT
TO authenticated WITH CHECK (public.is_manager());

CREATE POLICY "update:same-biz:manager+" ON public.customers FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

-- INVOICES TABLE - Secure RLS policies  
DROP POLICY IF EXISTS "write:same-biz:manager+" ON public.invoices;
DROP POLICY IF EXISTS "update:same-biz:manager+" ON public.invoices;

CREATE POLICY "write:same-biz:manager+" ON public.invoices FOR INSERT
TO authenticated WITH CHECK (public.is_manager());

CREATE POLICY "update:same-biz:manager+" ON public.invoices FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

-- INVOICE_ITEMS TABLE - Uses parent invoice's business context
-- invoice_items inherits business isolation through invoices table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_items') THEN
        -- Enable RLS if not already enabled
        EXECUTE 'ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY';
        
        -- Drop existing policies
        EXECUTE 'DROP POLICY IF EXISTS "read:via-invoice" ON public.invoice_items';
        EXECUTE 'DROP POLICY IF EXISTS "write:via-invoice:manager+" ON public.invoice_items';  
        EXECUTE 'DROP POLICY IF EXISTS "update:via-invoice:manager+" ON public.invoice_items';
        EXECUTE 'DROP POLICY IF EXISTS "delete:via-invoice:admin" ON public.invoice_items';
        
        -- Create policies that check business_id through invoice relationship
        EXECUTE 'CREATE POLICY "read:via-invoice" ON public.invoice_items FOR SELECT
                 TO authenticated USING (
                   EXISTS(SELECT 1 FROM public.invoices 
                          WHERE invoices.id = invoice_items.invoice_id 
                          AND invoices.business_id = public.current_business_id())
                 )';
        
        EXECUTE 'CREATE POLICY "write:via-invoice:manager+" ON public.invoice_items FOR INSERT
                 TO authenticated WITH CHECK (
                   public.is_manager() AND
                   EXISTS(SELECT 1 FROM public.invoices 
                          WHERE invoices.id = invoice_items.invoice_id 
                          AND invoices.business_id = public.current_business_id())
                 )';
        
        EXECUTE 'CREATE POLICY "update:via-invoice:manager+" ON public.invoice_items FOR UPDATE
                 TO authenticated 
                 USING (
                   public.is_manager() AND
                   EXISTS(SELECT 1 FROM public.invoices 
                          WHERE invoices.id = invoice_items.invoice_id 
                          AND invoices.business_id = public.current_business_id())
                 )
                 WITH CHECK (
                   public.is_manager() AND
                   EXISTS(SELECT 1 FROM public.invoices 
                          WHERE invoices.id = invoice_items.invoice_id 
                          AND invoices.business_id = public.current_business_id())
                 )';
        
        EXECUTE 'CREATE POLICY "delete:via-invoice:admin" ON public.invoice_items FOR DELETE
                 TO authenticated USING (
                   public.is_admin() AND
                   EXISTS(SELECT 1 FROM public.invoices 
                          WHERE invoices.id = invoice_items.invoice_id 
                          AND invoices.business_id = public.current_business_id())
                 )';
    END IF;
END $$;

-- LAYOUTS TABLE - Secure RLS policies
DROP POLICY IF EXISTS "write:same-biz:manager+" ON public.layouts;
DROP POLICY IF EXISTS "update:same-biz:manager+" ON public.layouts;

CREATE POLICY "write:same-biz:manager+" ON public.layouts FOR INSERT
TO authenticated WITH CHECK (public.is_manager());

CREATE POLICY "update:same-biz:manager+" ON public.layouts FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

-- LAYOUT_SECTIONS TABLE - Uses parent layout's business context
-- layout_sections inherits business isolation through layouts table
DROP POLICY IF EXISTS "read:via-layout" ON public.layout_sections;
DROP POLICY IF EXISTS "write:via-layout:manager+" ON public.layout_sections;
DROP POLICY IF EXISTS "update:via-layout:manager+" ON public.layout_sections;
DROP POLICY IF EXISTS "delete:via-layout:admin" ON public.layout_sections;

-- Enable RLS if not already enabled
ALTER TABLE public.layout_sections ENABLE ROW LEVEL SECURITY;

-- Create policies that check business_id through layout relationship
CREATE POLICY "read:via-layout" ON public.layout_sections FOR SELECT
TO authenticated USING (
  EXISTS(SELECT 1 FROM public.layouts 
         WHERE layouts.id = layout_sections.layout_id 
         AND layouts.business_id = public.current_business_id())
);

CREATE POLICY "write:via-layout:manager+" ON public.layout_sections FOR INSERT
TO authenticated WITH CHECK (
  public.is_manager() AND
  EXISTS(SELECT 1 FROM public.layouts 
         WHERE layouts.id = layout_sections.layout_id 
         AND layouts.business_id = public.current_business_id())
);

CREATE POLICY "update:via-layout:manager+" ON public.layout_sections FOR UPDATE
TO authenticated 
USING (
  public.is_manager() AND
  EXISTS(SELECT 1 FROM public.layouts 
         WHERE layouts.id = layout_sections.layout_id 
         AND layouts.business_id = public.current_business_id())
)
WITH CHECK (
  public.is_manager() AND
  EXISTS(SELECT 1 FROM public.layouts 
         WHERE layouts.id = layout_sections.layout_id 
         AND layouts.business_id = public.current_business_id())
);

CREATE POLICY "delete:via-layout:admin" ON public.layout_sections FOR DELETE
TO authenticated USING (
  public.is_admin() AND
  EXISTS(SELECT 1 FROM public.layouts 
         WHERE layouts.id = layout_sections.layout_id 
         AND layouts.business_id = public.current_business_id())
);

-- LAYOUT_FIELDS TABLE - Uses parent section's layout's business context
-- layout_fields inherits business isolation through layout_sections -> layouts
DROP POLICY IF EXISTS "read:via-section-layout" ON public.layout_fields;
DROP POLICY IF EXISTS "write:via-section-layout:manager+" ON public.layout_fields;
DROP POLICY IF EXISTS "update:via-section-layout:manager+" ON public.layout_fields;
DROP POLICY IF EXISTS "delete:via-section-layout:admin" ON public.layout_fields;

-- Enable RLS if not already enabled
ALTER TABLE public.layout_fields ENABLE ROW LEVEL SECURITY;

-- Create policies that check business_id through section -> layout relationship
CREATE POLICY "read:via-section-layout" ON public.layout_fields FOR SELECT
TO authenticated USING (
  EXISTS(SELECT 1 FROM public.layout_sections ls
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE ls.id = layout_fields.section_id 
         AND l.business_id = public.current_business_id())
);

CREATE POLICY "write:via-section-layout:manager+" ON public.layout_fields FOR INSERT
TO authenticated WITH CHECK (
  public.is_manager() AND
  EXISTS(SELECT 1 FROM public.layout_sections ls
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE ls.id = layout_fields.section_id 
         AND l.business_id = public.current_business_id())
);

CREATE POLICY "update:via-section-layout:manager+" ON public.layout_fields FOR UPDATE
TO authenticated 
USING (
  public.is_manager() AND
  EXISTS(SELECT 1 FROM public.layout_sections ls
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE ls.id = layout_fields.section_id 
         AND l.business_id = public.current_business_id())
)
WITH CHECK (
  public.is_manager() AND
  EXISTS(SELECT 1 FROM public.layout_sections ls
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE ls.id = layout_fields.section_id 
         AND l.business_id = public.current_business_id())
);

CREATE POLICY "delete:via-section-layout:admin" ON public.layout_fields FOR DELETE
TO authenticated USING (
  public.is_admin() AND
  EXISTS(SELECT 1 FROM public.layout_sections ls
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE ls.id = layout_fields.section_id 
         AND l.business_id = public.current_business_id())
);

-- LAYOUT_FIELD_OPTIONS TABLE - Uses parent field's section's layout's business context  
-- layout_field_options inherits business isolation through layout_fields -> layout_sections -> layouts
DROP POLICY IF EXISTS "read:via-field-section-layout" ON public.layout_field_options;
DROP POLICY IF EXISTS "write:via-field-section-layout:manager+" ON public.layout_field_options;
DROP POLICY IF EXISTS "update:via-field-section-layout:manager+" ON public.layout_field_options;
DROP POLICY IF EXISTS "delete:via-field-section-layout:admin" ON public.layout_field_options;

-- Enable RLS if not already enabled
ALTER TABLE public.layout_field_options ENABLE ROW LEVEL SECURITY;

-- Create policies that check business_id through field -> section -> layout relationship
CREATE POLICY "read:via-field-section-layout" ON public.layout_field_options FOR SELECT
TO authenticated USING (
  EXISTS(SELECT 1 FROM public.layout_fields lf
         JOIN public.layout_sections ls ON ls.id = lf.section_id
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE lf.id = layout_field_options.field_id 
         AND l.business_id = public.current_business_id())
);

CREATE POLICY "write:via-field-section-layout:manager+" ON public.layout_field_options FOR INSERT
TO authenticated WITH CHECK (
  public.is_manager() AND
  EXISTS(SELECT 1 FROM public.layout_fields lf
         JOIN public.layout_sections ls ON ls.id = lf.section_id
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE lf.id = layout_field_options.field_id 
         AND l.business_id = public.current_business_id())
);

CREATE POLICY "update:via-field-section-layout:manager+" ON public.layout_field_options FOR UPDATE
TO authenticated 
USING (
  public.is_manager() AND
  EXISTS(SELECT 1 FROM public.layout_fields lf
         JOIN public.layout_sections ls ON ls.id = lf.section_id
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE lf.id = layout_field_options.field_id 
         AND l.business_id = public.current_business_id())
)
WITH CHECK (
  public.is_manager() AND
  EXISTS(SELECT 1 FROM public.layout_fields lf
         JOIN public.layout_sections ls ON ls.id = lf.section_id
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE lf.id = layout_field_options.field_id 
         AND l.business_id = public.current_business_id())
);

CREATE POLICY "delete:via-field-section-layout:admin" ON public.layout_field_options FOR DELETE
TO authenticated USING (
  public.is_admin() AND
  EXISTS(SELECT 1 FROM public.layout_fields lf
         JOIN public.layout_sections ls ON ls.id = lf.section_id
         JOIN public.layouts l ON l.id = ls.layout_id
         WHERE lf.id = layout_field_options.field_id 
         AND l.business_id = public.current_business_id())
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the setup is correct:

-- 1. Verify triggers are in place for tables with business_id columns:
/*
SELECT 
    t.table_name,
    t.trigger_name,
    t.event_manipulation,
    t.action_timing,
    t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_name LIKE '%auto_assign_business_id%'
ORDER BY t.table_name;
*/

-- 2. Verify RLS policies are in place for all tenant tables:
/*
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
WHERE tablename IN (
    'items', 'customers', 'invoices', 'layouts',
    'invoice_items', 'layout_sections', 'layout_fields', 'layout_field_options'
)
ORDER BY tablename, cmd;
*/

-- 3. Verify which tables have business_id columns:
/*
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name IN (
    'items', 'customers', 'invoices', 'layouts',
    'invoice_items', 'layout_sections', 'layout_fields', 'layout_field_options'
) 
AND column_name = 'business_id'
ORDER BY table_name;
*/
