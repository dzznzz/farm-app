-- ================================================
-- 농장관리 앱 Supabase DB 스키마
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ================================================

-- 1. 프로필 테이블 (Supabase Auth 연동)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 농장 테이블
CREATE TABLE farms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  area_sqm DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 수확량 기록
CREATE TABLE harvest_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  quantity DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 판매 기록
CREATE TABLE sales_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  quantity DOUBLE PRECISION NOT NULL,
  price_per_unit DOUBLE PRECISION NOT NULL,
  total_revenue DOUBLE PRECISION NOT NULL,
  buyer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 수확 세션 (동선 추적)
CREATE TABLE harvest_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 위치 트랙
CREATE TABLE harvest_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES harvest_sessions(id) ON DELETE CASCADE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================
-- Row Level Security (RLS) 설정
-- ================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_tracks ENABLE ROW LEVEL SECURITY;

-- profiles RLS
CREATE POLICY "본인 프로필만 조회" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "본인 프로필만 수정" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "회원가입 시 프로필 생성" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- farms RLS
CREATE POLICY "본인 농장만 CRUD" ON farms FOR ALL USING (auth.uid() = user_id);

-- harvest_records RLS
CREATE POLICY "본인 수확 기록만 CRUD" ON harvest_records FOR ALL USING (auth.uid() = user_id);

-- sales_records RLS
CREATE POLICY "본인 판매 기록만 CRUD" ON sales_records FOR ALL USING (auth.uid() = user_id);

-- harvest_sessions RLS
CREATE POLICY "본인 세션만 CRUD" ON harvest_sessions FOR ALL USING (auth.uid() = user_id);

-- harvest_tracks RLS (세션을 통해 본인 확인)
CREATE POLICY "본인 트랙만 CRUD" ON harvest_tracks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM harvest_sessions
      WHERE harvest_sessions.id = harvest_tracks.session_id
        AND harvest_sessions.user_id = auth.uid()
    )
  );

-- ================================================
-- 인덱스 (성능 최적화)
-- ================================================
CREATE INDEX idx_harvest_user_date ON harvest_records(user_id, date);
CREATE INDEX idx_sales_user_date ON sales_records(user_id, date);
CREATE INDEX idx_tracks_session ON harvest_tracks(session_id);

-- ================================================
-- 샘플 데이터 (테스트용 - 선택사항)
-- ================================================
-- 회원가입 후 Supabase Auth에서 user id를 확인하고 아래 UUID를 교체하세요
-- INSERT INTO farms (user_id, name, crop_type, area_sqm)
-- VALUES ('your-user-uuid', '1번 밭', '딸기', 3000);
