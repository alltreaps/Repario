# Secure Multi-Tenant Data Isolation Guide

## Overview
This guide documents the secure multi-tenant isolation pattern implemented in Repario, ensuring that no business data can leak between tenants and that business_id assignment happens securely on the server side.

## Security Architecture

### 1. Database-Level Security (RLS + Triggers)

#### Auto-Assignment Triggers
```sql
-- All tenant tables have triggers that automatically assign business_id
CREATE TRIGGER auto_assign_business_id_[table]
    BEFORE INSERT ON public.[table]
    FOR EACH ROW EXECUTE FUNCTION public.auto_assign_business_id();
```

**Protected Tables:**
- `items` - Products/services
- `customers` - Customer records  
- `invoices` - Invoice headers
- `invoice_items` - Invoice line items
- `layouts` - Custom invoice layouts
- `layout_sections` - Layout sections
- `layout_fields` - Layout fields

#### Row Level Security Policies
```sql
-- Read: Users can only see data from their business
CREATE POLICY "read:same-biz" ON public.[table] FOR SELECT
TO authenticated USING (business_id = public.current_business_id());

-- Insert: Only managers+ can create, business_id assigned by trigger
CREATE POLICY "write:same-biz:manager+" ON public.[table] FOR INSERT
TO authenticated WITH CHECK (public.is_manager());

-- Update: Only managers+ can update data in their business
CREATE POLICY "update:same-biz:manager+" ON public.[table] FOR UPDATE
TO authenticated 
USING (business_id = public.current_business_id() AND public.is_manager())
WITH CHECK (business_id = public.current_business_id() AND public.is_manager());

-- Delete: Only admins can delete data in their business  
CREATE POLICY "delete:same-biz:admin" ON public.[table] FOR DELETE
TO authenticated USING (business_id = public.current_business_id() AND public.is_admin());
```

### 2. API Security Pattern

#### Secure Write Operations
```typescript
// ✅ SECURE - No business_id from client
app.post('/api/items', authenticateToken, async (req, res) => {
  const itemData = {
    name: req.body.name,
    unit_price: req.body.unit_price,
    user_id: req.user.userId
    // business_id automatically assigned by trigger
  };
  
  const { data, error } = await supabase
    .from('items')
    .insert(itemData);
});

// ❌ INSECURE - Client could spoof business_id  
app.post('/api/items', authenticateToken, async (req, res) => {
  const itemData = {
    ...req.body,
    business_id: req.body.business_id, // NEVER DO THIS!
    user_id: req.user.userId
  };
});
```

#### Secure Read Operations
```typescript
// ✅ SECURE - RLS automatically filters
app.get('/api/items', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false });
  // RLS ensures only same-business items returned
});

// ❌ UNNECESSARY - Manual filtering when RLS handles it
app.get('/api/items', authenticateToken, async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', req.user.userId)
    .single();
    
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('business_id', profile.business_id); // Redundant with RLS
});
```

### 3. Special Cases

#### User Management (Profiles Table)
```typescript
// Profiles need explicit business_id handling since admins manage users
app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', req.user.userId)
    .single();

  const { error } = await supabase
    .from('profiles')
    .insert({
      ...userData,
      business_id: adminProfile.business_id // Explicit assignment needed
    });
});
```

#### Business Registration
```typescript
// During registration, business_id is assigned via RPC function
const { data: businessData, error } = await supabase
  .rpc('create_business_with_admin', {
    p_business_name: businessName,
    p_admin_user_id: authUser.user.id,
    p_admin_full_name: fullName
  });
```

## Implementation Checklist

### ✅ Database Setup
- [x] `current_business_id()` helper function
- [x] `auto_assign_business_id()` trigger function  
- [x] Triggers on all tenant tables
- [x] RLS policies with automatic filtering
- [x] RLS policies without business_id in WITH CHECK for inserts

### ✅ API Security
- [x] Remove manual business_id assignment from client data
- [x] Rely on database triggers for business_id assignment
- [x] Remove manual business_id filtering where RLS handles it
- [x] Keep explicit business_id handling only for special cases

### ✅ Frontend Security
- [x] Never send business_id in request bodies
- [x] Rely on server-side authentication for tenant context
- [x] Trust that API returns only accessible data

## Verification

### Test Tenant Isolation
```sql
-- Verify triggers are in place
SELECT 
    t.table_name,
    t.trigger_name,
    t.event_manipulation,
    t.action_timing
FROM information_schema.triggers t
WHERE t.trigger_name LIKE '%auto_assign_business_id%'
ORDER BY t.table_name;

-- Verify RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('items', 'customers', 'invoices', 'layouts')
ORDER BY tablename, cmd;
```

### Test API Security
```bash
# Test that items are isolated per business
curl -H "Authorization: Bearer $TOKEN1" /api/items
curl -H "Authorization: Bearer $TOKEN2" /api/items  

# Verify no data leaks between businesses
# Should return different datasets
```

## Benefits

1. **Zero Data Leakage**: Impossible for clients to access other businesses' data
2. **No Client Trust**: Server assigns business_id, clients cannot spoof it  
3. **Automatic Filtering**: RLS handles tenant isolation transparently
4. **Defense in Depth**: Multiple layers prevent business_id spoofing
5. **Developer Safety**: Hard to accidentally create security vulnerabilities

## Migration Notes

If migrating from manual business_id handling:

1. Apply the `secure-tenant-isolation-fix.sql` script
2. Update API routes to remove manual business_id assignment
3. Test thoroughly with multiple business accounts
4. Verify no business_id values in client-side code
5. Monitor for any RLS policy violations in logs
