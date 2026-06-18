-- Migration 014: 거래처(clients) 테이블.
--
-- 판매처(거래처)를 관리한다. 농장(farms)과 유사한 사용자별 CRUD 구조.
--  · channel          : 'online' | 'offline' — 판매 입력 시 채널에 맞는 거래처를 선택지로 노출.
--  · commission_type  : '%' | '원'
--  · commission_value : 수수료 값 (비율 또는 금액)
--
-- 과거 기록 유지 정책: 판매 기록(sales_records)은 입력 당시의 수수료·구매자명을
-- 그대로 보관하므로, 여기 값을 나중에 수정해도 과거 기록/통계에는 영향이 없다.

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'offline',
  commission_type text NOT NULL DEFAULT '%',
  commission_value numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_user_channel_idx ON clients (user_id, channel);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "본인 거래처만 CRUD" ON clients;
CREATE POLICY "본인 거래처만 CRUD" ON clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
