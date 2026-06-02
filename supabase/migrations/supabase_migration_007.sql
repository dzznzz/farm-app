-- Migration 007: 작업자(인건비) 정보 테이블 추가

CREATE TABLE IF NOT EXISTS labor_records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date          DATE NOT NULL,
  worker_name   TEXT NOT NULL,
  work_hours    NUMERIC,
  labor_cost    NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS 활성화
ALTER TABLE labor_records ENABLE ROW LEVEL SECURITY;

-- 본인 데이터만 접근
CREATE POLICY "Users can manage own labor records"
  ON labor_records
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 날짜·사용자 기준 조회 성능
CREATE INDEX IF NOT EXISTS idx_labor_records_user_date
  ON labor_records (user_id, date);
