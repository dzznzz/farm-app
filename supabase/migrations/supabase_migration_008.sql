-- Migration 008: other_records에 extra_cost 컬럼 추가
ALTER TABLE other_records ADD COLUMN IF NOT EXISTS extra_cost NUMERIC(12,2);
