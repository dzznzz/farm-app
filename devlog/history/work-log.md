# 작업 이력 (Work Log)

> 커밋 기준 상세 작업 내역. 개요는 `history.md` 참고.

---

## 2026-06-02 (2차) — 커밋 `49135bb`

### 목적
코드 리뷰 후 발견된 7가지 기능 공백 해소

---

### 1. 수정 모드에서 원래 farm_id 복원

**파일**: `RecordDetailModal.tsx`, `input.tsx`, `InputFormModal.tsx`

- `DisplayRecord` 인터페이스에 `farmId?: string | null`, `farmName?: string | null` 추가
- 수확/판매/기타 기록 조회 쿼리에 `farm_id` 포함
- 레코드 상세 시트에 "농장" 행 표시
- 수정 모드 `useEffect`에 `if (editRecord.farmId) setFarmId(editRecord.farmId)` 추가

---

### 2. Google Sheets 인건비 순수익 반영

**파일**: `lib/googleSheets.ts`, `components/modals/ExportModal.tsx`

- `fetchMonthlyExportData` 반환 타입: `ExportRow[]` → `{ rows: ExportRow[], laborTotal: number }`
- `labor_records` 월간 합계 조회 추가
- `createMonthlySpreadsheet`에 `laborTotal` 파라미터 추가
- 요약 행 순수익 = `매출 - 수수료 - 부수비용 - 인건비`
- 인건비 > 0인 경우 "※ 인건비" 별도 행 추가

---

### 3. 통계 농장별 필터

**파일**: `hooks/useStats.ts`, `app/(tabs)/statistics.tsx`

- `applyFarm(query, farmId?)` 헬퍼 함수 추가
- `useStats(userId, farmId?)` — farmId 파라미터 추가, 차트 데이터 필터링
- `fetchPeriodSummary(userId, period, farmId?)` — 요약 데이터 필터링
- `statistics.tsx`: farms 로드, `selectedFarmId` 상태, 농장 칩 선택 UI (2개 이상 시만 표시)

---

### 4. 수확 vs 판매 재고

기존 "잔여 재고" 카드가 농장 필터 연동으로 농장별 재고 확인 가능 (별도 구현 불필요)

---

### 5. 작년 동월 비교 (월별 모드)

**파일**: `hooks/useStats.ts`, `app/(tabs)/statistics.tsx`

- `getCurrentAndPrevRange`에 `prevYearFrom`, `prevYearTo` 추가 (month 모드만)
- `fetchPeriodSummary` 반환: `{ current, previous, previousYear? }`
- `statistics.tsx` compareCard에 month 모드 전용 "작년 동월 비교" 구분선 + 2개 행 추가

---

### 6. 단가 히스토리

**파일**: `hooks/useStats.ts`, `app/(tabs)/statistics.tsx`

- `fetchPriceHistory(userId, from, to, farmId?)` 신규 함수
  - `sales_records`에서 `price_per_unit > 0` 조건으로 최근 20건 조회
  - 반환: `{ date, price, label(작물+품종+사이즈) }[]`
- `statistics.tsx` 하단에 "최근 판매 단가" 카드 추가 (최근 8건 목록)

---

### 7. 입력 목록에 농장 뱃지

**파일**: `app/(tabs)/input.tsx`

- 모든 record 조회에 `farm_id` 포함
- `getFarmName(farmId)` 헬퍼로 `farms` 상태에서 이름 해석
- 레코드 카드 cropType 앞에 농장 초록 뱃지 표시 (farmName이 있을 때만)

---

## 2026-06-02 (1차) — 커밋 `a309f3b`

### 1. Google Sheets 앱 크래시 수정

**파일**: `components/modals/ExportModal.tsx`

- `@react-native-google-signin/google-signin` 완전 제거
- `expo-auth-session/providers/google` + `WebBrowser.maybeCompleteAuthSession()` 적용
- `exchangeCodeAsync` 수동 토큰 교환 (expo-auth-session v5 자동 교환 미지원)
- iOS: `iosClientId` → reversed scheme redirect URI 자동 처리
- `extraParams: { prompt: 'select_account' }` → 매번 계정 선택 강제

---

### 2. Google Sheets 농장 컬럼 + 디자인

**파일**: `lib/googleSheets.ts`

- `ExportRow`에 `farm_name: string` 추가
- 그룹 키: `date|farmId|cropType|variety|size`
- `farms` 테이블 병렬 조회 → `farmMap(id→name)` 생성
- 헤더 14컬럼: 일자·농장·작물·품종·사이즈·수확량·판매량·단가·매출·수수료율·수수료·부수비용·순수익·기타수량
- `applyFormatting()` — Sheets batchUpdate:
  - 헤더: 짙은 초록 배경 + 흰 굵은 글씨 + 중앙정렬 + 행 고정
  - 합계: 연한 노란 배경 + 굵게
  - 원화 컬럼: `#,##0` 포맷
  - 수수료율: `0.0"%"` 포맷
  - 컬럼 자동 너비
  - 외곽 초록 굵은 / 내부 회색 얇은 테두리

---

### 3. 연락처 네이티브 피커 전환

**파일**: `components/pages/ContactsPage.tsx`

- `presentContactPickerAsync` → `Contact.presentPicker()` (class-based API)
- 권한 요청 불필요 (CNContactPickerViewController)
- 버튼 누를 때마다 피커 호출, 차단 로직 제거
- `deleteContact`에 `await loadContacts()` 누락 수정

---

### 4. TODO 알람 툴팁 레이아웃 수정

**파일**: `app/(tabs)/todo.tsx`

- `alarmTooltipWrapper`: `position: 'relative'`
- `tooltipFloating`: `position: 'absolute', bottom: '100%', right: 0`
- 등록 모드(`showAlarmTooltip`) + 수정 모드(`showEditAlarmTooltip`) 모두 적용

---

### 5. 농장 설정 전면 개선

**파일**: `components/pages/FarmSettingsPage.tsx`

- 최대 5개 제한 (`MAX_FARMS = 5`)
- `is_primary` 뱃지 + "대표 설정" 버튼 → `setPrimaryFarm()` (전체 false → 선택 true)
- 주소 필드 추가, 카카오 Keyword API 검색 모달
- 버튼 레이아웃: `flexDirection: 'row'`, 동일 너비(`width: 70`) 우측 하단 정렬
- DB: `farms.is_primary BOOLEAN`, `farms.address TEXT` 컬럼 추가

---

### 6. 입력 등록·수정 농장 선택 step 추가

**파일**: `components/modals/InputFormModal.tsx`, `app/(tabs)/input.tsx`

- `getStepIds`: harvest `['date','farm','crop','entries']`, sales `+['price']`, other `+['otherType']`
- 대표 농장(`is_primary`) 기본 선택 (`useEffect([visible, farms])`)
- 수정 모드: 날짜 SectionCard + 농장 SectionCard 분리
- 모든 edit update에 `farm_id: farmId || null` 포함
- `input.tsx` farms 쿼리에 `is_primary` 포함

---

### 7. 관리자 데이터 관리 모바일 표시

**파일**: `app/(tabs)/more.tsx`, `components/pages/AdminDataPage.tsx`

- `isAdmin` 조건: `userRole === 'admin'` (플랫폼 제한 제거)
- 모바일 배지: "관리자 메뉴 · PC에서만 수정 가능"
- `AdminDataPage`: `readOnly?: boolean` prop 추가
- readOnly=true 시: 노란 배너 + `pointerEvents="none"` (뒤로가기만 동작)
