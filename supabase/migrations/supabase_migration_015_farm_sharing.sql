-- ============================================================
-- Migration 015: 농장 공유 (농장주/구성원 + 권한 신청)
-- ------------------------------------------------------------
-- TO-BE 20. 하나의 농장을 여러 계정이 공유한다.
--  · farm_members        : 농장별 구성원 (owner | member). 농장 생성 시 최초 등록자가 owner로 자동 등록.
--  · farm_join_requests  : 농장 권한 신청 (pending | approved | rejected).
--
-- 권한 모델 (구성원 member):
--   - 조회: 농장 전체 데이터 조회 가능 (아래 *_farm_member_read SELECT 정책 추가)
--   - 입력: 본인 user_id 로 입력 가능 (기존 "본인만 CRUD" 정책이 INSERT 를 이미 허용)
--   - 수정/삭제: 본인이 입력한 것만 (기존 정책 유지 — 별도 확장 없음)
--
-- 주의: 기존 정책은 건드리지 않고 SELECT 정책만 "추가"하므로(PERMISSIVE OR 결합)
--       단일 사용자 동작은 그대로 유지된다.
-- ============================================================

-- ── 1. 테이블 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (farm_id, user_id)
);
CREATE INDEX IF NOT EXISTS farm_members_user_idx ON farm_members (user_id);
CREATE INDEX IF NOT EXISTS farm_members_farm_idx ON farm_members (farm_id);

CREATE TABLE IF NOT EXISTS farm_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (farm_id, user_id)
);
CREATE INDEX IF NOT EXISTS farm_join_requests_farm_idx ON farm_join_requests (farm_id, status);

-- ── 2. 보조 함수 (SECURITY DEFINER — RLS 재귀 회피) ─────────
CREATE OR REPLACE FUNCTION is_farm_member(f uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM farm_members m WHERE m.farm_id = f AND m.user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_farm_owner(f uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM farm_members m WHERE m.farm_id = f AND m.user_id = auth.uid() AND m.role = 'owner');
$$;

-- ── 3. 농장 생성 시 농장주 자동 등록 ───────────────────────
CREATE OR REPLACE FUNCTION farms_after_insert_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO farm_members (farm_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (farm_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_farms_owner ON farms;
CREATE TRIGGER trg_farms_owner AFTER INSERT ON farms
FOR EACH ROW EXECUTE FUNCTION farms_after_insert_owner();

-- 기존 농장 → 농장주 멤버십 백필
INSERT INTO farm_members (farm_id, user_id, role)
SELECT id, user_id, 'owner' FROM farms
ON CONFLICT (farm_id, user_id) DO NOTHING;

-- ── 4. RLS: 신규 테이블 ────────────────────────────────────
ALTER TABLE farm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_join_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "구성원 조회" ON farm_members;
CREATE POLICY "구성원 조회" ON farm_members FOR SELECT
  USING (is_farm_member(farm_id));
-- 쓰기는 모두 아래 SECURITY DEFINER 함수/트리거를 통해서만 (직접 INSERT/UPDATE/DELETE 불가)

DROP POLICY IF EXISTS "신청 조회" ON farm_join_requests;
CREATE POLICY "신청 조회" ON farm_join_requests FOR SELECT
  USING (user_id = auth.uid() OR is_farm_owner(farm_id));
DROP POLICY IF EXISTS "본인 신청 생성" ON farm_join_requests;
CREATE POLICY "본인 신청 생성" ON farm_join_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "본인 신청 취소" ON farm_join_requests;
CREATE POLICY "본인 신청 취소" ON farm_join_requests FOR DELETE
  USING (user_id = auth.uid());

-- ── 5. RLS: 데이터 테이블에 "구성원 조회(SELECT)" 정책 추가 ──
--    (기존 "본인만 CRUD" 정책은 그대로 두고 OR 로 결합)
DROP POLICY IF EXISTS "harvest_records_farm_member_read" ON harvest_records;
CREATE POLICY "harvest_records_farm_member_read" ON harvest_records FOR SELECT USING (is_farm_member(farm_id));
DROP POLICY IF EXISTS "sales_records_farm_member_read" ON sales_records;
CREATE POLICY "sales_records_farm_member_read" ON sales_records FOR SELECT USING (is_farm_member(farm_id));
DROP POLICY IF EXISTS "other_records_farm_member_read" ON other_records;
CREATE POLICY "other_records_farm_member_read" ON other_records FOR SELECT USING (is_farm_member(farm_id));
DROP POLICY IF EXISTS "labor_records_farm_member_read" ON labor_records;
CREATE POLICY "labor_records_farm_member_read" ON labor_records FOR SELECT USING (is_farm_member(farm_id));
DROP POLICY IF EXISTS "harvest_notes_farm_member_read" ON harvest_notes;
CREATE POLICY "harvest_notes_farm_member_read" ON harvest_notes FOR SELECT USING (is_farm_member(farm_id));
DROP POLICY IF EXISTS "other_notes_farm_member_read" ON other_notes;
CREATE POLICY "other_notes_farm_member_read" ON other_notes FOR SELECT USING (is_farm_member(farm_id));
DROP POLICY IF EXISTS "harvest_sessions_farm_member_read" ON harvest_sessions;
CREATE POLICY "harvest_sessions_farm_member_read" ON harvest_sessions FOR SELECT USING (is_farm_member(farm_id));

-- farms: 구성원은 자신이 속한 농장을 조회 가능
DROP POLICY IF EXISTS "farms_member_read" ON farms;
CREATE POLICY "farms_member_read" ON farms FOR SELECT USING (is_farm_member(id));

-- ── 6. RPC: 신청/승인/반려/구성원관리/승계/검색 ────────────
-- 권한 신청
CREATE OR REPLACE FUNCTION request_farm_join(p_farm uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF is_farm_member(p_farm) THEN RAISE EXCEPTION '이미 구성원입니다'; END IF;
  INSERT INTO farm_join_requests (farm_id, user_id, status, created_at, decided_at)
  VALUES (p_farm, auth.uid(), 'pending', now(), NULL)
  ON CONFLICT (farm_id, user_id)
  DO UPDATE SET status='pending', created_at=now(), decided_at=NULL;
END; $$;

-- 승인 (농장주만)
CREATE OR REPLACE FUNCTION approve_join_request(p_req uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r farm_join_requests%ROWTYPE;
BEGIN
  SELECT * INTO r FROM farm_join_requests WHERE id = p_req;
  IF NOT FOUND THEN RAISE EXCEPTION '신청을 찾을 수 없습니다'; END IF;
  IF NOT is_farm_owner(r.farm_id) THEN RAISE EXCEPTION '권한이 없습니다'; END IF;
  INSERT INTO farm_members (farm_id, user_id, role)
  VALUES (r.farm_id, r.user_id, 'member')
  ON CONFLICT (farm_id, user_id) DO NOTHING;
  UPDATE farm_join_requests SET status='approved', decided_at=now() WHERE id=p_req;
END; $$;

-- 반려 (농장주만)
CREATE OR REPLACE FUNCTION reject_join_request(p_req uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r farm_join_requests%ROWTYPE;
BEGIN
  SELECT * INTO r FROM farm_join_requests WHERE id = p_req;
  IF NOT FOUND THEN RAISE EXCEPTION '신청을 찾을 수 없습니다'; END IF;
  IF NOT is_farm_owner(r.farm_id) THEN RAISE EXCEPTION '권한이 없습니다'; END IF;
  UPDATE farm_join_requests SET status='rejected', decided_at=now() WHERE id=p_req;
END; $$;

-- 구성원 삭제 (농장주만, 농장주 자신은 불가)
CREATE OR REPLACE FUNCTION remove_farm_member(p_farm uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_farm_owner(p_farm) THEN RAISE EXCEPTION '권한이 없습니다'; END IF;
  DELETE FROM farm_members WHERE farm_id=p_farm AND user_id=p_user AND role <> 'owner';
END; $$;

-- 농장주 승계 (현재 농장주 → 구성원, 대상 구성원 → 농장주)
CREATE OR REPLACE FUNCTION transfer_farm_ownership(p_farm uuid, p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_farm_owner(p_farm) THEN RAISE EXCEPTION '권한이 없습니다'; END IF;
  IF NOT EXISTS (SELECT 1 FROM farm_members WHERE farm_id=p_farm AND user_id=p_user) THEN
    RAISE EXCEPTION '대상이 구성원이 아닙니다';
  END IF;
  UPDATE farm_members SET role='member' WHERE farm_id=p_farm AND user_id=auth.uid();
  UPDATE farm_members SET role='owner'  WHERE farm_id=p_farm AND user_id=p_user;
  UPDATE farms SET user_id=p_user WHERE id=p_farm; -- 대표 소유자 포인터 동기화
END; $$;

-- 농장 검색 (이름/주소 LIKE) + 내 상태
CREATE OR REPLACE FUNCTION search_farms(p_q text)
RETURNS TABLE (
  id uuid, name text, address text, crop_type text,
  owner_name text, member_count bigint, my_status text
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT f.id, f.name, f.address, f.crop_type,
    p.name AS owner_name,
    (SELECT count(*) FROM farm_members m WHERE m.farm_id = f.id) AS member_count,
    CASE
      WHEN EXISTS (SELECT 1 FROM farm_members m WHERE m.farm_id=f.id AND m.user_id=auth.uid() AND m.role='owner') THEN 'owner'
      WHEN EXISTS (SELECT 1 FROM farm_members m WHERE m.farm_id=f.id AND m.user_id=auth.uid()) THEN 'member'
      WHEN EXISTS (SELECT 1 FROM farm_join_requests r WHERE r.farm_id=f.id AND r.user_id=auth.uid() AND r.status='pending') THEN 'pending'
      ELSE 'none'
    END AS my_status
  FROM farms f
  LEFT JOIN profiles p ON p.id = f.user_id
  WHERE coalesce(trim(p_q),'') <> ''
    AND (f.name ILIKE '%'||p_q||'%' OR coalesce(f.address,'') ILIKE '%'||p_q||'%')
  ORDER BY f.name
  LIMIT 30;
$$;

-- 내가 농장주인 농장들의 대기중 신청 목록 (신청자 이름/이메일 포함)
CREATE OR REPLACE FUNCTION owner_pending_requests()
RETURNS TABLE (
  request_id uuid, farm_id uuid, farm_name text,
  user_id uuid, user_name text, user_email text, created_at timestamptz
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT r.id, r.farm_id, f.name, r.user_id, p.name, p.email, r.created_at
  FROM farm_join_requests r
  JOIN farms f ON f.id = r.farm_id
  LEFT JOIN profiles p ON p.id = r.user_id
  WHERE r.status='pending'
    AND EXISTS (SELECT 1 FROM farm_members m WHERE m.farm_id=r.farm_id AND m.user_id=auth.uid() AND m.role='owner')
  ORDER BY r.created_at;
$$;

-- 농장 구성원 상세 (이름/이메일/역할) — 해당 농장 구성원만 조회 가능
CREATE OR REPLACE FUNCTION farm_members_detail(p_farm uuid)
RETURNS TABLE (user_id uuid, user_name text, user_email text, role text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT m.user_id, p.name, p.email, m.role, m.created_at
  FROM farm_members m
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE m.farm_id = p_farm
    AND EXISTS (SELECT 1 FROM farm_members me WHERE me.farm_id=p_farm AND me.user_id=auth.uid())
  ORDER BY (m.role='owner') DESC, p.name;
$$;

-- 함수 실행 권한
GRANT EXECUTE ON FUNCTION
  request_farm_join(uuid), approve_join_request(uuid), reject_join_request(uuid),
  remove_farm_member(uuid, uuid), transfer_farm_ownership(uuid, uuid),
  search_farms(text), owner_pending_requests(), farm_members_detail(uuid),
  is_farm_member(uuid), is_farm_owner(uuid)
  TO authenticated;
