-- Add invoice status history table to track all status changes
-- Run this in Supabase SQL editor

BEGIN;

-- Create invoice_status_history table
CREATE TABLE IF NOT EXISTS invoice_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('draft','pending','working','done','refused')),
  message TEXT,
  extra_note TEXT,
  changed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE invoice_status_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access status history for their own invoices
DROP POLICY IF EXISTS "Users can view own invoice status history" ON invoice_status_history;
CREATE POLICY "Users can view own invoice status history" ON invoice_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_status_history.invoice_id 
      AND invoices.user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

DROP POLICY IF EXISTS "Users can insert own invoice status history" ON invoice_status_history;
CREATE POLICY "Users can insert own invoice status history" ON invoice_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_status_history.invoice_id 
      AND invoices.user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_status_history_invoice_id 
  ON invoice_status_history(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_status_history_created_at 
  ON invoice_status_history(created_at DESC);

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_invoice_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO invoice_status_history (
      invoice_id,
      status,
      message,
      changed_by,
      created_at
    ) VALUES (
      NEW.id,
      NEW.status,
      CASE NEW.status
        WHEN 'draft' THEN 'Invoice saved as draft'
        WHEN 'pending' THEN 'Invoice set to pending'
        WHEN 'working' THEN 'Work started on invoice'
        WHEN 'done' THEN 'Invoice completed'
        WHEN 'refused' THEN 'Invoice refused'
        ELSE 'Status changed to ' || NEW.status
      END,
      NEW.user_id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log status changes
DROP TRIGGER IF EXISTS trigger_log_invoice_status_change ON invoices;
CREATE TRIGGER trigger_log_invoice_status_change
  AFTER UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION log_invoice_status_change();

-- Insert initial status history for existing invoices (one-time migration)
INSERT INTO invoice_status_history (invoice_id, status, message, changed_by, created_at)
SELECT 
  id,
  COALESCE(status, 'pending'),
  'Initial status (migrated)',
  user_id,
  created_at
FROM invoices
WHERE NOT EXISTS (
  SELECT 1 FROM invoice_status_history 
  WHERE invoice_status_history.invoice_id = invoices.id
);

COMMIT;

-- Verify the setup
SELECT 'Invoice status history table created successfully!' as status;
