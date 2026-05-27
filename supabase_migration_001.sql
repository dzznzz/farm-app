-- harvest_records에 작물/품종/사이즈 컬럼 추가
ALTER TABLE harvest_records
  ADD COLUMN IF NOT EXISTS crop_type TEXT,
  ADD COLUMN IF NOT EXISTS variety  TEXT,
  ADD COLUMN IF NOT EXISTS size     TEXT;

-- sales_records에 작물/품종/사이즈 컬럼 추가
ALTER TABLE sales_records
  ADD COLUMN IF NOT EXISTS crop_type TEXT,
  ADD COLUMN IF NOT EXISTS variety  TEXT,
  ADD COLUMN IF NOT EXISTS size     TEXT;
