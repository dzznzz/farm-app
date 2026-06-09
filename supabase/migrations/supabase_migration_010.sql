-- Migration 010: labor_records에 farm_id 컬럼 추가
ALTER TABLE labor_records ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES farms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_labor_records_user_farm_date
  ON labor_records (user_id, farm_id, date);
