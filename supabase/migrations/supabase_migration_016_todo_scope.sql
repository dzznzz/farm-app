-- ============================================================
-- Migration 016: 할 일 개인/구성원 구분
-- ------------------------------------------------------------
-- TO-BE 21. 할 일에 구분(scope)을 추가한다.
--  · scope = 'personal' : 본인 계정에서만 보이는 개인 할 일 (기본값)
--  · scope = 'shared'   : 농장 구성원 전체에게 보이는 공유 할 일 (farm_id 지정)
--
-- 권한 모델 (협업형):
--   - 조회: 본인 것 전체 + 내가 속한 농장의 공유 할 일
--   - 입력: 본인 user_id 로만. 공유 할 일은 내가 구성원인 농장에 대해서만.
--   - 수정/삭제: 본인 것 + 내가 속한 농장의 공유 할 일(완료 체크/수정/삭제 공동)
--
-- 주의: 기존 단일 정책 "todos_own"(FOR ALL) 을 세분화된 정책들로 교체한다.
--       scope 기본값이 'personal' 이라 기존 행 동작은 그대로 유지된다.
-- ============================================================

-- ── 1. 컬럼 추가 ───────────────────────────────────────────
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'personal'
    CHECK (scope IN ('personal', 'shared'));
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES farms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS todos_farm_idx ON todos (farm_id, date);

-- 공유(shared) 할 일은 반드시 farm_id 를 가져야 한다.
ALTER TABLE todos DROP CONSTRAINT IF EXISTS todos_shared_needs_farm;
ALTER TABLE todos ADD CONSTRAINT todos_shared_needs_farm
  CHECK (scope = 'personal' OR farm_id IS NOT NULL);

-- ── 2. RLS 정책 교체 ───────────────────────────────────────
-- 기존 통합 정책 제거
DROP POLICY IF EXISTS "todos_own" ON todos;

-- 조회: 본인 것 OR 내가 속한 농장의 공유 할 일
DROP POLICY IF EXISTS "todos_read" ON todos;
CREATE POLICY "todos_read" ON todos FOR SELECT
  USING (
    user_id = auth.uid()
    OR (scope = 'shared' AND is_farm_member(farm_id))
  );

-- 입력: 항상 본인 user_id 로. 공유면 내가 구성원인 농장이어야 함.
DROP POLICY IF EXISTS "todos_insert" ON todos;
CREATE POLICY "todos_insert" ON todos FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (scope = 'personal' OR is_farm_member(farm_id))
  );

-- 수정: 본인 것 OR 내가 속한 농장의 공유 할 일 (협업형)
DROP POLICY IF EXISTS "todos_update" ON todos;
CREATE POLICY "todos_update" ON todos FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (scope = 'shared' AND is_farm_member(farm_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (scope = 'shared' AND is_farm_member(farm_id))
  );

-- 삭제: 본인 것 OR 내가 속한 농장의 공유 할 일 (협업형)
DROP POLICY IF EXISTS "todos_delete" ON todos;
CREATE POLICY "todos_delete" ON todos FOR DELETE
  USING (
    user_id = auth.uid()
    OR (scope = 'shared' AND is_farm_member(farm_id))
  );
