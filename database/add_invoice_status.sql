-- Add invoice status and settings for status-based messaging
-- Run this in Supabase SQL editor or your DB migration process

BEGIN;

-- 1) Add status column to invoices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'status'
  ) THEN
    ALTER TABLE invoices
      ADD COLUMN status TEXT NOT NULL DEFAULT 'pending',
      ADD CONSTRAINT invoices_status_check CHECK (status IN ('pending','working','done','refused'));
  END IF;
END $$;

-- 2) Create invoice_status_settings table to store per-user message templates and toggles
CREATE TABLE IF NOT EXISTS invoice_status_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending','working','done','refused')),
  default_message TEXT NOT NULL,
  allow_extra_note BOOLEAN NOT NULL DEFAULT false,
  send_whatsapp BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, status)
);

-- Enable RLS and policies
ALTER TABLE invoice_status_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own status settings" ON invoice_status_settings;
CREATE POLICY "Users can view own status settings" ON invoice_status_settings
  FOR SELECT USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can insert own status settings" ON invoice_status_settings;
CREATE POLICY "Users can insert own status settings" ON invoice_status_settings
  FOR INSERT WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can update own status settings" ON invoice_status_settings;
CREATE POLICY "Users can update own status settings" ON invoice_status_settings
  FOR UPDATE USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

DROP POLICY IF EXISTS "Users can delete own status settings" ON invoice_status_settings;
CREATE POLICY "Users can delete own status settings" ON invoice_status_settings
  FOR DELETE USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'sub');

-- Trigger to auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoice_status_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_invoice_status_settings_updated_at BEFORE UPDATE ON invoice_status_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;
