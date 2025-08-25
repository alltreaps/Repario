# 🗄️ Supabase Database Setup for Repario

Your backend server is ready, but you need to create the database tables in Supabase first.

## 📋 Quick Setup Steps

### 1. **Open Supabase Dashboard**

- Go to https://supabase.com/dashboard
- Sign in and select your project: `qapgakswzqvwjzsmlbkk`

### 2. **Run Database Schema**

- Click **"SQL Editor"** in the left sidebar
- Click **"New Query"**
- Copy and paste the entire contents of `schema.sql`
- Click **"Run"** to execute the SQL

### 3. **Verify Tables Created**

- Go to **"Table Editor"** in the sidebar
- You should see 8 new tables:
  - ✅ `profiles` (users)
  - ✅ `customers`
  - ✅ `layouts`
  - ✅ `layout_sections`
  - ✅ `layout_fields`
  - ✅ `layout_field_options`
  - ✅ `invoices`
  - ✅ `invoice_items`

## 🔐 What the Schema Includes

### **Tables & Relations**

- Complete 8-table structure with foreign keys
- UUID primary keys for all tables
- Proper relationships between all entities

### **Security (RLS)**

- Row Level Security enabled on all tables
- Users can only access their own data
- Comprehensive security policies

### **Performance**

- Optimized indexes on foreign keys
- Automatic `updated_at` timestamp triggers
- Efficient query patterns

### **Data Types**

- Proper field types (UUID, TEXT, DECIMAL, JSONB)
- Validation constraints
- Default values where appropriate

## 🧪 Test Database Connection

After running the schema, test your setup:

```bash
cd backend
node test-supabase.js
```

**Expected Results:**

- ✅ User registration should work
- ✅ JWT tokens should be generated
- ✅ Authenticated requests should succeed

## 🎯 Your Server Configuration

**Current Status:**

- ✅ Server: http://localhost:3001
- ✅ Supabase URL: https://qapgakswzqvwjzsmlbkk.supabase.co
- ✅ Service Role Key: Configured
- ⏳ Database: **Needs schema setup**

## 🚀 After Database Setup

Once you've run the schema, your complete stack will be ready:

1. **Backend API** ✅ - Running with JWT auth
2. **Supabase Database** ⏳ - Tables ready after schema
3. **React Frontend** ✅ - Ready for integration

---

**🎉 Run the schema.sql in Supabase SQL Editor and you're ready to go!**
