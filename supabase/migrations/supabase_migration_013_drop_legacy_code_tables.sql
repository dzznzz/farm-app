-- Migration 013: common_code 통합 완료 후 레거시 코드 테이블 제거.
--
-- ⚠️ 반드시 012 실행 후에만 적용할 것. 012 가 아래 테이블들로부터 common_code 를
--    채우므로, 012 를 먼저 돌려 데이터가 옮겨진 것을 확인한 뒤 드롭한다.
--    (드롭 후에는 012 를 단독 재실행할 수 없다 — 정상 동작이다.)
--
-- 안전성:
--  · 앱 코드는 더 이상 이 5개 테이블을 참조하지 않는다(common_code 로 일원화).
--  · harvest_records / sales_records / other_records / farms 는 작물·품종·사이즈·단위를
--    '이름(text)' 으로 저장하며 이 테이블들을 FK 로 참조하지 않는다 → 드롭해도 무방.
--
-- 혹시 모를 외래키가 있어도 깨지지 않도록 CASCADE 로 의존 제약만 정리한다.

DROP TABLE IF EXISTS varieties_master CASCADE;
DROP TABLE IF EXISTS sizes_master     CASCADE;
DROP TABLE IF EXISTS harvest_units     CASCADE;
DROP TABLE IF EXISTS expense_types     CASCADE;
DROP TABLE IF EXISTS crop_types        CASCADE;
