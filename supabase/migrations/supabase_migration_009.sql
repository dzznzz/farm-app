-- Migration 009: sales_records에 sale_type 컬럼 추가
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS sale_type TEXT;
