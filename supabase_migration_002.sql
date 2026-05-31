-- ================================================
-- Migration 002: 기타기록, 품종, 연락처 테이블 추가
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================

-- 1. 기타 기록 (나눔/폐기) 테이블
CREATE TABLE IF NOT EXISTS other_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gift', 'waste')),
  crop_type TEXT,
  variety TEXT,
  size TEXT,
  quantity DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  recipient TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE other_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 기타 기록만 CRUD" ON other_records FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_other_user_date ON other_records(user_id, date);

-- 2. 품종 테이블
CREATE TABLE IF NOT EXISTS varieties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_type TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(crop_type, name)
);

-- 기본 블루베리 품종 데이터
INSERT INTO varieties (crop_type, name) VALUES
  ('블루베리', '신틸라'),
  ('블루베리', '오닐'),
  ('블루베리', '미스티'),
  ('블루베리', '스타'),
  ('블루베리', '블루크롭'),
  ('블루베리', '엘리엇'),
  ('블루베리', '노스블루'),
  ('블루베리', '블루레이'),
  ('블루베리', '듀크')
ON CONFLICT (crop_type, name) DO NOTHING;

-- 3. 연락처 테이블
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "본인 연락처만 CRUD" ON contacts FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id, sort_order);
