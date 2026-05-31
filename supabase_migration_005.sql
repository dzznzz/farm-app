-- Migration 005: todos, expense_types, sales_records 수수료/부수비용

-- 1. todos
CREATE TABLE IF NOT EXISTS todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todos_own" ON todos
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. expense_types (관리자가 관리하는 부수비용 항목)
CREATE TABLE IF NOT EXISTS expense_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0
);
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_types_read" ON expense_types FOR SELECT USING (true);
CREATE POLICY "expense_types_admin_write" ON expense_types FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO expense_types (name, sort_order) VALUES
  ('택배비', 1),
  ('포장비', 2),
  ('인건비', 3),
  ('운반비', 4)
ON CONFLICT (name) DO NOTHING;

-- 3. sales_records에 수수료/부수비용 컬럼 추가
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS extra_cost NUMERIC(12,2) DEFAULT 0;
