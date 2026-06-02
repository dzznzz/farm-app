-- Add unit column to sales_records (was missing from initial schema)
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'kg';
