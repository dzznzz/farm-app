# 작업 이력 (Work Log)

> 커밋 기준 상세 작업 내역. 개요는 `history.md` 참고.

---

## 2026-06-07 (8차) — 커밋 미포함 (현재 작업)

### upsertSales sale_type 구분 키 추가

**파일**: `components/modals/InputFormModal.tsx`

```typescript
// 변경 전: sale_type 없이 조회 → 판매 유형 달라도 같은 사이즈면 합쳐짐
q = row.size ? q.eq('size', row.size) : q.is('size', null);

// 변경 후: sale_type도 매칭 키에 포함
q = row.size ? q.eq('size', row.size) : q.is('size', null);
q = row.sale_type ? q.eq('sale_type', row.sale_type) : q.is('sale_type', null);
```

---

## 2026-06-07 (7차) — 커밋 `fa5ffdd`

### 1. DB migration_009 — sales_records.sale_type

```sql
ALTER TABLE sales_records ADD COLUMN IF NOT EXISTS sale_type TEXT;
```

### 2. 판매 유형 STEP

**파일**: `components/modals/InputFormModal.tsx`

- STEP 3 (판매 탭 전용): 온라인 / 오프라인 / 지인판매 / 기타
- 기타 선택 시 직접 입력 TextInput 표시
- 저장 시 `sale_type: saleType` 포함

### 3. 판매 목록 묶음 카드

**파일**: `app/(tabs)/input.tsx`

- `groupSalesRecords(records)`: `farmId::cropType::buyer::saleType` 키로 그룹화
- `SaleGroup` 타입: `{ farmId, farmName, cropType, saleType, buyer, records, totalQty, totalRevenue, totalCommission, totalExtra }`
- 묶음 카드 렌더: 헤더(농장뱃지, 판매유형뱃지, 작물, 구매자), 항목별 행, 합계행

### 4. 그룹 수정 pre-fill

**파일**: `components/modals/InputFormModal.tsx`

- `openGroupEdit(sg.records)` 호출 시 commissionRate, commissionType, extraCost, buyer, saleType 복원
- GROUP UPDATE 시 해당 필드 모두 포함 저장

---

## 2026-06-07 (6차) — 커밋 `8b0c528`

### CalendarModal maxDate

**파일**: `components/modals/CalendarModal.tsx`

- `maxDate?: string` prop 추가
- `isDisabled = maxDate && day > maxDate` → 회색 텍스트 + `onPress` 비활성
- `isNextDisabled = maxDate && nextMonth > maxDate의 월` → `›` 버튼 비활성

**파일**: `app/(tabs)/statistics.tsx`

- `today` 상수 선언, `›` 버튼에 `disabled={range.to >= today}` 조건 추가
- `CalendarModal maxDate={today}` 전달

---

## 2026-06-07 (5차) — 커밋 `ba2c5f2`

### 날짜 네비게이터 최상단

**파일**: `app/(tabs)/statistics.tsx`

- 날짜 표시 + `‹` / `›` 버튼을 탭 최상단으로 이동
- 날짜 라벨 탭 → `CalendarModal` 오픈, 선택 날짜로 `range` 재계산
- 기간별 라벨: 일(6월 4일 (목)), 주(6월 1주차), 월(2026년 6월), 연(2026년)

### byVarietySize 도넛

**파일**: `hooks/useStats.ts`

- `fetchBreakdown` 반환: `byVarietySize` 필드 추가
- `byVarietySize`: `variety + ' ' + size` 조합으로 집계

**파일**: `app/(tabs)/statistics.tsx`

- 도넛 탭: 작물별 / 품종별 / 사이즈별 → **품종·사이즈별** 로 교체

### fetchPeriodSummaryForRange

**파일**: `hooks/useStats.ts`

- 커스텀 `from`, `to` 날짜 범위를 받아 요약 데이터 반환 (선택 날짜 기반 통계용)

---

## 2026-06-07 (4차) — 커밋 `b7174a4`

### 도넛 차트 카드 분리

**파일**: `app/(tabs)/statistics.tsx`

- `breakdownData` fetch를 날짜 네비게이터와 독립적으로 분리
- 별도 `donutFrom` / `donutTo` 상태, CalendarModal로 직접 날짜 범위 선택
- 전체너비 카드, 범례에 kg + % 표시

### 막대 차트 개선

```typescript
function getBarChartRange(period, today) {
  // 오늘 기준 최근 7개 기간 범위 반환
}
```

- 데이터 없는 날짜도 `{ label, value: 0 }` 으로 채워 빈 막대 표시

### 수정폼 개선

**파일**: `components/modals/InputFormModal.tsx`

- 수확/기타 탭 항목 수량 → TextInput 인라인 편집
- `sortEntries(entries, sizeOptions)`: 품종 asc → sizeOptions order asc 정렬
- 항목 추가, 수확데이터 import, 그룹 pre-fill 후 자동 정렬 적용

---

## 2026-06-07 (3차) — 커밋 `5372fc4`

### 통계 차트 좌우 분할

**파일**: `app/(tabs)/statistics.tsx`

```
좌 (PieChart): 작물별 / 품종별 / 품종·사이즈별 도넛 탭 전환
우 (BarChart): 수확량 / 매출 막대 탭 전환
```

- `fillFullRange(grouped, period, from, to)`: 빈 기간 0으로 채움
- 막대 `topLabelComponent`: 0이 아닐 때 수치 표기

### InputFormModal 날짜 동기화

**파일**: `components/modals/InputFormModal.tsx`

```typescript
useEffect(() => {
  if (visible && !editRecord) setDate(initialDate ?? today);
}, [visible]);
```

---

## 2026-06-07 (2차) — 커밋 `b923326`, `665c121`

### 판매 수확데이터 인라인 편집

**파일**: `components/modals/InputFormModal.tsx`

```typescript
const updateEntry = (i: number, field: 'quantity' | 'price', value: string) =>
  setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
```

판매 탭 항목 행: 수량 TextInput + 단가 TextInput 인라인 표시

### upsert 헬퍼

```typescript
async function upsertHarvest(row) { /* date+farm+crop+variety+size 매칭 → qty 누적 */ }
async function upsertSales(row)   { /* date+farm+crop+variety+size+sale_type 매칭 */ }
async function upsertOther(row)   { /* date+farm+crop+variety+size+type 매칭 */ }
```

### 그룹 수정 폼

**파일**: `app/(tabs)/input.tsx`, `components/modals/InputFormModal.tsx`

- `openGroupEdit(records: DisplayRecord[])` → `setGroupEditRecords` → `InputFormModal` 오픈
- `groupEditRecords`가 있으면 모든 항목 pre-fill, UPDATE/DELETE/INSERT 모두 지원

### initialDate prop

**파일**: `components/modals/InputFormModal.tsx`

- `initialDate?: string` prop 추가, 입력 탭 선택 날짜 전달 → 폼 date 초기화

---

## 2026-06-07 (1차) — 커밋 `0699fb1`

### 입력 목록 그룹화

**파일**: `app/(tabs)/input.tsx`

```typescript
type FarmCropGroup = { farmId, farmName, cropType, otherSubType, varieties, allRecords };
type VarietyGroup  = { variety, sizes };
type SizeRow       = { size, quantity, unit, revenue?, ids };

function groupByFarmCrop(records, recordType): FarmCropGroup[]
```

- 수확/기타: FarmCropGroup 카드, 품종→사이즈 트리 표시, 수량 합산
- 판매: totalRevenue 합산

### SizeEntryModal

**파일**: `components/modals/InputFormModal.tsx`

- 품종 선택 후 사이즈 칩 탭 → 바텀시트 오픈
- 수량 / 단가(판매 탭만) 입력
- 직접입력 사이즈: TextInput + 저장 버튼

### 수확데이터 가져오기

**파일**: `components/modals/InputFormModal.tsx`

- "수확데이터 가져오기" 버튼: `harvest_records`에서 당일 수확 조회
- 동일 품종+사이즈 합산 → entries에 자동 추가 (단가 빈칸)

---

## 2026-06-02 (4차) — 커밋 `d3fb1c7`, `4aa18ea`, `1089861`, `f566b67`

### Google Sheets redirect_uri_mismatch 수정

**파일**: `components/modals/ExportModal.tsx`

```typescript
// 변경 전 (수동 조립 → Google 400 Bad Request)
const redirectUri = `com.googleusercontent.apps.${clientId.replace('...')}:/oauthredirect`;

// 변경 후
redirectUri: request!.redirectUri,  // hook이 실제로 사용한 URI 그대로 전달
```

### 연락처 이름 필드 누락 수정

**파일**: `components/pages/ContactsPage.tsx`

```typescript
// 변경 전
const contact = await Contact.presentPicker();

// 변경 후
const contact = await Contact.presentPicker({
  fields: [Fields.Name, Fields.FirstName, Fields.LastName, Fields.PhoneNumbers],
});
```

### Named Export 수정

```typescript
// 변경 전
import * as Contact from 'expo-contacts';
Contact.Fields.Name  // undefined

// 변경 후
import * as Contact from 'expo-contacts';
import { Fields } from 'expo-contacts';
Fields.Name  // 정상 동작
```

### other_records.extra_cost 컬럼 추가

**파일**: `supabase/migrations/supabase_migration_008.sql`
```sql
ALTER TABLE other_records ADD COLUMN IF NOT EXISTS extra_cost NUMERIC(12,2);
```

- `input.tsx` select/mapping에 extra_cost 추가
- `RecordDetailModal`: 기타 타입도 부수비용 행 표시

### 농장 주소 focus 유지

**파일**: `components/pages/FarmSettingsPage.tsx`

- `AddressField` 내부 컴포넌트를 인라인 JSX로 전환
  (렌더마다 unmount → 키보드 포커스 해제 현상 해결)

### 수확 삭제 시 인건비 함께 삭제

**파일**: `components/modals/RecordDetailModal.tsx`

```typescript
// harvest 삭제 후
await supabase.from('labor_records')
  .delete().eq('user_id', userId).eq('date', record.date);
```

### 통계 상세 분석 농장 필터

**파일**: `hooks/useStats.ts`, `components/modals/BreakdownModal.tsx`

- `fetchBreakdown(userId, from, to, farmId?)` — farmId 필터 추가
- `BreakdownModal`에 `farmId` prop 추가, `statistics.tsx`에서 `selectedFarmId` 전달

---

## 2026-06-02 (3차) — 커밋 `614d1af`

### Fix 1. AdminDataPage 탭 원형 렌더링 (ISSUE-012)

**파일**: `components/pages/AdminDataPage.tsx`

- `<ScrollView horizontal contentContainerStyle={styles.tabs}>` → `<View style={styles.tabsRow}>`
- `tabs` 스타일 삭제, `tabsRow: { flexDirection: 'row', margin, backgroundColor, borderRadius: Radius.full, padding }` 신규
- `tabBtn`에 `flex: 1` 추가 → 5개 탭이 균등 분할

---

### Fix 2. 농장 뱃지 타이밍 버그 (ISSUE-013)

**파일**: `app/(tabs)/input.tsx`

```tsx
// 변경 전: loadRecords 시점에 farmName 저장 (farms가 비어있으면 null)
farmName: getFarmName(r.farm_id),

// 변경 후: 렌더 시점에 현재 farms state에서 실시간 조회
const fn = r.farmName ?? farms.find(f => f.id === r.farmId)?.name;
```

---

### Fix 3. 단가 히스토리 범위 (ISSUE-014)

**파일**: `app/(tabs)/statistics.tsx`

```typescript
// 변경 전: 선택 기간(curFrom~curTo)으로만 조회
fetchPriceHistory(user.id, curFrom, curTo, selectedFarmId)

// 변경 후: 기간 탭 무관, 항상 최근 30일
const d30 = new Date(); d30.setDate(d30.getDate() - 30);
fetchPriceHistory(user.id, d30.toISOString().split('T')[0], today, selectedFarmId)
```

---

### Fix 4. 통계 카드 전체 너비

**파일**: `app/(tabs)/statistics.tsx`

- `summaryCard: { width: '48%' }` → `width: '50%'`, gap 제거
- 모든 섹션 카드 `marginHorizontal: Spacing.lg` → `Spacing.md`
- `summaryGrid` padding 조정

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
