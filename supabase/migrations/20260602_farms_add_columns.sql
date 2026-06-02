-- ============================================================
-- Migration: farms 테이블 컬럼 추가
-- Date: 2026-06-02
-- Description:
--   - is_primary: 대표 농장 여부 (계정당 1개)
--   - address: 농장 주소 (선택 입력, 카카오 주소 검색 연동)
-- ============================================================

-- 대표 농장 여부
ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- 농장 주소 (선택사항)
ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS address TEXT;

-- ============================================================
-- (선택) 기존 데이터 처리
-- 이미 농장이 등록된 사용자의 경우, user_id별 첫 번째 농장을
-- 대표 농장으로 설정합니다.
-- ============================================================

UPDATE farms f
SET is_primary = TRUE
WHERE f.id IN (
  SELECT DISTINCT ON (user_id) id
  FROM farms
  ORDER BY user_id, created_at ASC
);
