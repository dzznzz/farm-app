-- Migration 004: role, crop/variety/size/unit master tables

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS crop_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS varieties_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_type TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crop_type, name)
);

CREATE TABLE IF NOT EXISTS sizes_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  crop_type TEXT NOT NULL,
  name TEXT NOT NULL,
  range_info TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crop_type, name)
);

CREATE TABLE IF NOT EXISTS harvest_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE varieties_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvest_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_crop_types" ON crop_types;
CREATE POLICY "read_crop_types" ON crop_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "write_crop_types" ON crop_types;
CREATE POLICY "write_crop_types" ON crop_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "read_varieties_master" ON varieties_master;
CREATE POLICY "read_varieties_master" ON varieties_master FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "write_varieties_master" ON varieties_master;
CREATE POLICY "write_varieties_master" ON varieties_master FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "read_sizes_master" ON sizes_master;
CREATE POLICY "read_sizes_master" ON sizes_master FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "write_sizes_master" ON sizes_master;
CREATE POLICY "write_sizes_master" ON sizes_master FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "read_harvest_units" ON harvest_units;
CREATE POLICY "read_harvest_units" ON harvest_units FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "write_harvest_units" ON harvest_units;
CREATE POLICY "write_harvest_units" ON harvest_units FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO crop_types (name, sort_order) VALUES ('블루베리', 0) ON CONFLICT (name) DO NOTHING;

INSERT INTO varieties_master (crop_type, name, sort_order) VALUES
  ('블루베리', '신틸라', 0),
  ('블루베리', '오닐', 1),
  ('블루베리', '미스티', 2),
  ('블루베리', '스타', 3),
  ('블루베리', '블루크롭', 4)
ON CONFLICT (crop_type, name) DO NOTHING;

INSERT INTO sizes_master (crop_type, name, range_info, sort_order) VALUES
  ('블루베리', '대', '14~16mm', 0),
  ('블루베리', '특', '16~18mm', 1),
  ('블루베리', '왕특', '18~20mm', 2),
  ('블루베리', '왕왕특', '20mm 이상', 3)
ON CONFLICT (crop_type, name) DO NOTHING;

INSERT INTO harvest_units (name, sort_order) VALUES
  ('kg', 0),
  ('박스', 1)
ON CONFLICT (name) DO NOTHING;
