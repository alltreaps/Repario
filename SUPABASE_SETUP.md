# Repario - Invoice Management System

## Supabase Setup Guide

### 1. Environment Configuration

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials in `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 2. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `backend/supabase-schema.sql`
4. Execute the SQL to create all tables and RLS policies

### 3. Authentication Setup

The system uses Supabase Auth with the following features:

- Email/password authentication
- Automatic profile creation on signup
- Row Level Security (RLS) for data isolation

### 4. Database Schema Overview

#### Core Tables:

- **profiles**: User profile information
- **customers**: Customer contact details
- **layouts**: Invoice layout templates
- **layout_sections**: Sections within layouts
- **layout_fields**: Fields within sections
- **layout_field_options**: Options for dropdown/checkbox fields
- **invoices**: Invoice records with totals
- **invoice_items**: Line items for each invoice

#### Security:

- All tables have RLS enabled
- Users can only access their own data
- Foreign key relationships ensure data integrity

### 5. API Functions Available

#### Authentication:

- `getCurrentUser()`: Get current authenticated user
- `signIn(email, password)`: Sign in user
- `signUp(email, password, displayName?)`: Register new user
- `signOut()`: Sign out current user

#### Profiles:

- `createProfile(userId, displayName?)`: Create user profile
- `getProfile(userId)`: Get user profile
- `updateProfile(userId, updates)`: Update profile

#### Customers:

- `fetchCustomers()`: Get all user's customers
- `createCustomer(customer)`: Create new customer
- `updateCustomer(id, updates)`: Update customer
- `deleteCustomer(id)`: Delete customer

#### Layouts:

- `fetchLayouts()`: Get all user's layouts
- `fetchLayoutDeep(layoutId)`: Get layout with sections/fields
- `saveLayout(layout)`: Create new layout
- `updateLayout(id, updates)`: Update layout
- `deleteLayout(id)`: Delete layout
- `setDefaultLayout(layoutId)`: Set default layout

#### Layout Management:

- `createLayoutSection()`: Add section to layout
- `createLayoutField()`: Add field to section
- `createLayoutFieldOption()`: Add option to field
- Update/delete functions for each component

#### Invoices:

- `fetchInvoices()`: Get all user's invoices
- `fetchInvoiceWithDetails(id)`: Get invoice with items/customer
- `saveInvoice(invoice)`: Create new invoice with items
- `updateInvoice(id, updates)`: Update invoice
- `deleteInvoice(id)`: Delete invoice

### 6. Next Steps

1. Set up Supabase project and configure environment variables
2. Run the SQL schema script
3. Test authentication flow
4. Integrate API functions with existing Zustand stores
5. Replace mock data with real Supabase calls

### 7. Data Flow

```
User Authentication → Profile Creation → Customer Management → Layout Design → Invoice Creation
```

Each step is secured with RLS policies ensuring users only access their own data.

### 8. Development Workflow

1. Start development server: `npm run dev`
2. Ensure Supabase is configured correctly
3. Test API calls in browser console
4. Gradually replace Zustand store functions with Supabase calls

### 9. TypeScript Integration

The system includes full TypeScript support with:

- Database type definitions
- Strongly typed API functions
- Extended types for complex queries
- Type-safe data transformations

### 10. Error Handling

All API functions include proper error handling and will throw errors that can be caught by the calling code. Consider implementing:

- Loading states
- Error boundaries
- Toast notifications for user feedback
