-- Migration 012: 분리된 코드 테이블(crop_types / varieties_master / sizes_master /
-- harvest_units / expense_types)을 common_code 하나로 통합.
--
-- 설계
--  · main_code : 코드 분류  ('crop' | 'vari' | 'size' | 'unit' | 'exps')
--  · desc_code : 분류 내 코드. (main_code, desc_code) 가 자연키 → UNIQUE.
--                main_code 안에서 전역으로 1부터 0-패딩 3자리('001'..)로 부여.
--  · hpos_main_code / hpos_desc_code : 부모 코드. 품종/사이즈는 부모가 작물이라
--                hpos_main_code='crop', hpos_desc_code=해당 작물의 desc_code.
--  · info       : 사이즈의 range_info 보관용.
--
-- 기존 5개 테이블은 그대로 두고, 여기서 common_code 를 재생성/재적재(idempotent).
-- 레코드(harvest_records 등)는 이름(name)으로 저장되므로 id 보존은 불필요.

CREATE TABLE IF NOT EXISTS common_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_code text NOT NULL,
  desc_code text NOT NULL,
  name text NOT NULL,
  sort_order int4,
  hpos_main_code text,
  hpos_desc_code text,
  info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (main_code, desc_code)
);

-- 조회 성능용 인덱스 (부모 기준 조회 빈번)
CREATE INDEX IF NOT EXISTS common_code_parent_idx
  ON common_code (main_code, hpos_main_code, hpos_desc_code);

-- RLS
ALTER TABLE common_code ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS common_code_read ON common_code;
CREATE POLICY common_code_read ON common_code FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS common_code_write ON common_code;
CREATE POLICY common_code_write ON common_code FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 재적재 (idempotent) ──────────────────────────────────────────────
TRUNCATE common_code;

-- 작물 코드 매핑 (이름 → desc_code). 품종/사이즈 부모 링크에 재사용.
WITH crop_codes AS (
  SELECT name,
         lpad(row_number() OVER (ORDER BY sort_order, name)::text, 3, '0') AS code
  FROM crop_types
)
INSERT INTO common_code (main_code, desc_code, name, sort_order, hpos_main_code, hpos_desc_code, info)
SELECT 'crop', code, name,
       (row_number() OVER (ORDER BY code))::int - 1,
       NULL, NULL, NULL
FROM crop_codes;

-- 품종: main_code 내 전역 시퀀스, 부모는 작물 desc_code
WITH crop_codes AS (
  SELECT name, lpad(row_number() OVER (ORDER BY sort_order, name)::text, 3, '0') AS code
  FROM crop_types
)
INSERT INTO common_code (main_code, desc_code, name, sort_order, hpos_main_code, hpos_desc_code, info)
SELECT 'vari',
       lpad(row_number() OVER (ORDER BY v.crop_type, v.sort_order, v.name)::text, 3, '0'),
       v.name, v.sort_order, 'crop', c.code, NULL
FROM varieties_master v
JOIN crop_codes c ON c.name = v.crop_type;

-- 사이즈: info = range_info
WITH crop_codes AS (
  SELECT name, lpad(row_number() OVER (ORDER BY sort_order, name)::text, 3, '0') AS code
  FROM crop_types
)
INSERT INTO common_code (main_code, desc_code, name, sort_order, hpos_main_code, hpos_desc_code, info)
SELECT 'size',
       lpad(row_number() OVER (ORDER BY s.crop_type, s.sort_order, s.name)::text, 3, '0'),
       s.name, s.sort_order, 'crop', c.code, s.range_info
FROM sizes_master s
JOIN crop_codes c ON c.name = s.crop_type;

-- 단위 (flat)
INSERT INTO common_code (main_code, desc_code, name, sort_order, hpos_main_code, hpos_desc_code, info)
SELECT 'unit',
       lpad(row_number() OVER (ORDER BY sort_order, name)::text, 3, '0'),
       name, sort_order, NULL, NULL, NULL
FROM harvest_units;

-- 비용 항목 (flat)
INSERT INTO common_code (main_code, desc_code, name, sort_order, hpos_main_code, hpos_desc_code, info)
SELECT 'exps',
       lpad(row_number() OVER (ORDER BY sort_order, name)::text, 3, '0'),
       name, sort_order, NULL, NULL, NULL
FROM expense_types;
