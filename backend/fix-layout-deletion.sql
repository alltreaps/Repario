-- Fix layout deletion by allowing NULL layout_id in invoices
-- This allows layouts to be deleted even when referenced by invoices

-- First, drop the existing foreign key constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_layout_id_fkey;

-- Modify the column to allow NULL values
ALTER TABLE invoices ALTER COLUMN layout_id DROP NOT NULL;

-- Re-add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE invoices ADD CONSTRAINT invoices_layout_id_fkey 
  FOREIGN KEY (layout_id) REFERENCES layouts(id) ON DELETE SET NULL;

-- Update any existing invoices with invalid layout references to NULL
-- (This is just a safety measure in case there are orphaned references)
UPDATE invoices 
SET layout_id = NULL 
WHERE layout_id NOT IN (SELECT id FROM layouts);

COMMENT ON COLUMN invoices.layout_id IS 'Reference to layout used for this invoice. Can be NULL if layout was deleted.';
