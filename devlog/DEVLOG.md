# 농장관리 앱 개발 로그

---

## 개발 환경

| 항목 | 버전 |
|------|------|
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| Expo CLI | 56.1.12 |
| Expo SDK | 56 |
| React Native | 0.85.3 |
| TypeScript | 6.0.3 |

---

## 2026-06-07 — 8차 작업 (판매 유형별 구분 저장 버그 수정)

### upsertSales sale_type 누락 수정

`upsertSales` 함수가 기존 레코드를 찾을 때 `sale_type`을 매칭 키에 포함하지 않아, 판매 유형이 달라도(지인판매 vs 오프라인판매) 같은 날짜·농장·품종·사이즈면 단일 레코드로 합쳐지던 버그 수정.

매칭 키: `date + farm_id + crop_type + variety + size + sale_type`

---

## 2026-06-07 — 7차 작업 (판매 유형 필수 STEP + 판매 묶음 카드)

### 판매 유형(sale_type) 필드 추가

- `sales_records.sale_type` 컬럼 추가 (migration_009.sql)
- 판매 입력 3번째 STEP: 온라인 / 오프라인 / 지인판매 / 기타(직접입력) 선택 필수
- 저장 시 `sale_type` 컬럼에 기록

### 판매 목록 묶음 카드 표시

- `buyer + saleType` 기준 그룹화 → 묶음 단위 카드
- 카드 내 항목별 품종·사이즈 / 수량 / 단가 / 소계 행
- 카드 하단 합계 qty + 총매출 + 순수익 표시

### 그룹 수정 pre-fill 완성

- 수수료율·타입, 부수비용, 구매자, 판매유형 모두 수정폼에 복원
- GROUP UPDATE 시 수수료·부수비용·구매자·sale_type 포함 저장

---

## 2026-06-07 — 6차 작업 (통계 미래 날짜 선택 차단)

### CalendarModal maxDate

- `CalendarModal`에 `maxDate` prop 추가
- maxDate 이후 날짜 회색 처리 + 탭 비활성화
- 다음달 버튼 maxDate 월 도달 시 비활성화
- `statistics.tsx`: `›` 버튼 `range.to >= today` 이면 비활성화, CalendarModal에 `maxDate={today}` 전달

---

## 2026-06-07 — 5차 작업 (통계 날짜 네비게이터 + 품종·사이즈 도넛)

### 날짜 네비게이터 최상단 이동

- 날짜 네비게이터를 통계 탭 최상단으로 이동 → 모든 통계가 선택 날짜 기준으로 출력
- 일별: 하루씩 `‹ 6월 4일 (목) ›`
- 주별: 주차씩 `‹ 6월 1주차 ›`
- 월별: 월씩 `‹ 2026년 6월 ›`
- 연별: 년씩 `‹ 2026년 ›`
- 날짜 라벨 탭 → CalendarModal로 직접 날짜 지정

### 도넛 차트 '사이즈별' → '품종·사이즈별'

- `byVarietySize`: 품종+사이즈 조합으로 집계
- `useStats.fetchBreakdown`에 `byVarietySize` 추가

### useStats 신규 함수

- `fetchPeriodSummaryForRange`: 커스텀 날짜 범위 요약

---

## 2026-06-07 — 4차 작업 (통계 차트 개선 + 수정폼 개선)

### 통계 도넛 차트

- 전체너비 별도 카드로 분리 (크게)
- 날짜 범위 독립 fetch (breakdownData 분리)
- 범례에 kg + 비율(%) 표시

### 통계 막대 차트

- 오늘 기준 7개 기간으로 항상 표시 (`getBarChartRange`)
- 전체너비 카드로 분리
- 데이터 없는 날짜도 빈 막대 표시

### 수정폼 개선

- 수확/기타 수정폼에 수량 인라인 TextInput 적용
- 항목 목록 정렬: 품종 asc → sizeOptions order asc

---

## 2026-06-07 — 3차 작업 (통계 차트 도넛/막대 분할 + 날짜 동기화)

### 통계 차트 분할

- 좌: 작물/품종/사이즈별 도넛 차트(PieChart), 탭 전환
- 우: 수확량/매출 막대 차트(BarChart)
- 데이터 없는 날짜도 빈 막대 표시 (`fillFullRange`)
- 막대 최상단 수치 표기 (`topLabelComponent`)

### InputFormModal 날짜 동기화 버그 수정

- 신규 입력 시 `visible` 변경 시점에 `initialDate` 동기화
- 다른 날짜에서 오늘로 이동 후 `+` 누르면 오늘 날짜로 설정

---

## 2026-06-07 — 2차 작업 (수확데이터 인라인 편집 + upsert + 그룹 수정)

### 판매 수확데이터 항목 인라인 편집

- 수확데이터 가져오기 항목: 수량 TextInput + 단가 TextInput 인라인 표시
- 수량 pre-fill, 단가 직접 입력
- `updateEntry(i, field, value)` 헬퍼 추가

### 입력 저장 upsert 처리

- `upsertHarvest` / `upsertSales` / `upsertOther` 헬퍼 분리
- 동일 farm/crop/variety/size 레코드 존재 시 INSERT 대신 quantity 누적 UPDATE
- N건 뱃지 제거

### 그룹 전체 수정 폼

- 카드 탭 → 해당 그룹 모든 항목이 pre-fill된 폼 오픈
- 항목 수량/단가 수정 → UPDATE
- 항목 ✕ → DB DELETE
- 새 항목 추가 → upsert

### 수확데이터 가져오기 날짜 버그 수정

- `InputFormModal`에 `initialDate` prop 추가
- 폼의 date가 today 고정이던 문제 → 입력 탭 선택 날짜 사용

---

## 2026-06-07 — 1차 작업 (데이터 입력 UI 전면 개선)

### 입력 목록 그룹화

- 농장/작물별 카드로 묶어 표시, 품종/사이즈 수량 합산
- 판매 합산 매출액 표시
- 복수 기록 탭 → 바텀시트로 개별 선택

### 수확데이터 가져오기 (판매 입력)

- 당일 수확 데이터를 판매 항목에 자동 import
- 동일 품종+사이즈 합산 후 price 입력란 제공

### 사이즈별 단가 개별 입력

- 판매 입력 시 항목마다 개별 단가 지정 (공통 단가 스텝 제거)

### SizeEntryModal 도입

- 품종 선택 후 사이즈 탭 → 바텀시트로 수량/단가 입력
- 직접 입력 시 사이즈명 TextInput 포함

---

## 2026-06-02 — 4차 작업 (버그 수정: Google Sheets, 연락처, 기타 4종)

### Google Sheets Bad Request 수정

`ExportModal.tsx`: `exchangeCodeAsync` 시 수동 조립한 redirectUri → `request!.redirectUri` (hook 실제 사용값) 로 교체

### 연락처 이름 필드 누락 수정

`Contact.presentPicker()`에 `fields` 옵션 명시:
```ts
{ fields: [Contact.Fields.Name, Contact.Fields.FirstName, Contact.Fields.LastName, Contact.Fields.PhoneNumbers] }
```

### expo-contacts Named Export 수정

`Contact.Fields` → `Fields` (expo-contacts v56 별도 named export)

### 앱 이름 변경 + 기타 4건 버그 수정

- `other_records.extra_cost` 컬럼 추가 (migration_008.sql), 기타 타입도 부수비용 표시
- 농장 주소 입력 focus 유지: AddressField 인라인 JSX 전환
- 수확 삭제 시 동일 날짜 `labor_records` 함께 삭제
- `fetchBreakdown`에 `farmId` 파라미터 추가 → 통계 상세 분석 농장 필터 적용

---

## 2026-06-02 — 3차 작업 (UI 버그 수정 4건)

### 데이터 관리 탭 렌더링 깨짐 수정

`ScrollView horizontal`의 `contentContainerStyle`에 `borderRadius: Radius.full`이 적용되어 PC/웹에서 원형 렌더링. 5개 탭이 고정이므로 `View`로 교체, `tabsRow` 스타일로 통일.

### 농장 뱃지 타이밍 버그 수정

`loadRecords`가 `farms` 로드보다 먼저 완료되면 `getFarmName()`이 빈 배열을 참조해 `farmName = null` 저장됨. 렌더 시점에 `farms` state에서 실시간 조회(`r.farmName ?? farms.find(...)`)하는 방식으로 변경.

### 단가 히스토리 범위 수정

일별 탭 선택 시 오늘 하루 판매 데이터만 조회해 섹션이 항상 숨겨지던 문제. 기간 탭과 무관하게 최근 30일 고정 조회로 변경.

### 통계 카드 전체 너비

요약 카드 `width: '48%'` → `50%`, 모든 섹션 `marginHorizontal: Spacing.lg` → `Spacing.md`로 조정해 화면을 꽉 채우도록 수정.

---

## 2026-06-02 — 2차 작업 (7가지 기능 개선)

### 수정 모드 farm_id 복원

`DisplayRecord`에 `farmId`, `farmName` 추가. 수확/판매/기타 기록 수정 시 원래 농장이 자동 선택됨. 입력 목록 카드에 농장 초록 뱃지 표시.

### Google Sheets 인건비 반영

`labor_records` 월간 합계를 조회해 순수익에서 차감. 합계 행에 `실 순수익 = 매출 - 수수료 - 부수비용 - 인건비` 적용. 인건비가 있으면 별도 주석 행 표시.

### 통계 농장별 필터

농장 2개 이상 등록 시 통계 상단에 농장 칩 필터 표시. 선택 농장 기준으로 차트·요약·재고·단가 모두 재계산. `useStats` / `fetchPeriodSummary` 에 `farmId` 파라미터 추가.

### 작년 동월 비교 (월별 탭)

월별 탭 "기간 비교" 카드에 "작년 동월 비교" 구분선과 매출·수확량 비교 행 추가.

### 단가 히스토리

통계 페이지 하단에 "최근 판매 단가" 카드 추가. `fetchPriceHistory` 함수로 기간 내 최근 8건 단가 목록 표시.

---

## 2026-06-02 — 1차 작업 (주요 기능 개선 + 버그 수정)

### Google Sheets 앱 크래시 수정 + 재구현

`@react-native-google-signin` v16이 `google-services.json` 없이 네이티브 크래시 → `expo-auth-session/providers/google` 브라우저 기반 OAuth2로 완전 전환. `exchangeCodeAsync` 수동 토큰 교환 구현. iOS 클라이언트 ID 사용으로 커스텀 스킴 리다이렉트 지원. 내보낼 때마다 계정 선택 강제(`prompt: 'select_account'`).

### Google Sheets 농장 컬럼 + 디자인

14컬럼(`일자·농장·작물·품종·사이즈·수확량·판매량·단가·매출·수수료율·수수료·부수비용·순수익·기타수량`) 구조. Sheets `batchUpdate`로 헤더 초록, 합계 노란, 천 단위 포맷, 자동 너비, 테두리 적용.

### 연락처 네이티브 피커

`presentContactPickerAsync` deprecated → `Contact.presentPicker()` (iOS 시스템 UI, 권한 불필요). 버튼 누를 때마다 피커 호출, 차단 로직 제거.

### TODO 알람 툴팁 레이아웃 수정

툴팁을 `position: absolute, bottom: '100%'`로 floating 처리하여 하단 바 레이아웃 깨짐 해소.

### 농장 설정 전면 개선

- 최대 5개 제한
- 대표 농장 지정 / 뱃지 표시
- 주소 필드 + 카카오 REST API 주소 검색 모달
- 버튼 동일 크기(70px) 가로 정렬
- DB: `farms.is_primary`, `farms.address` 컬럼 추가 (`20260602_farms_add_columns.sql`)

### 입력 등록 농장 step 추가

등록 흐름: `날짜 → 농장 → 작물 → 내역`. 대표 농장 기본 선택. 수정 모드에서 날짜·농장 분리. farm_id 수정 저장 반영.

### 관리자 모바일 표시

관리자 계정이면 모바일에서도 "데이터 관리" 메뉴 표시. 진입 시 배너 + `pointerEvents="none"` 차단.

---

## 2026-06-01 — TODO 알람, 인건비, 통계 개선

### 할 일(TODO) 알람

`expo-notifications`으로 지정 시간 10분 전 로컬 알림. 알람 아이콘 탭 시 툴팁 안내. 시간 수정 시 기존 알람 취소 후 재예약.

### 인건비 기능

수확 입력에 작업자(이름·근무시간·인건비) 다중 등록. `labor_records` 테이블에 INSERT. 통계 요약에 인건비 차감 표시. 순수익 = 매출 - 수수료 - 부수비용 - 인건비.

### 통계 개선

- 기간별(일/주/월/연) 실제 DB 데이터로 요약 카드
- 추이 차트 최근 7구간
- 기간 비교(전기 대비 %)
- 잔여 재고(수확 - 판매 - 기타)
- 작물·품종·사이즈별 상세 분석 모달(BreakdownModal)

### 입력 탭 전면 재설계

기존 form → 날짜 네비게이션 + FAB(+) 버튼 구조. `InputFormModal`: 단계별 STEP 폼, 다중 항목 추가, 수정/삭제 기능 포함.

---

## 2026-06-01 — 버그 수정

| 이슈 | 해결 |
|---|---|
| ISSUE-001 | EAS 빌드 이미지 `xcode-26.2` 전환 (Swift 6.2 지원) |
| ISSUE-002 | `eas secret:push` 로 환경변수 EAS에 등록 |
| ISSUE-003 | BarChart `gradientColor` prop 제거 |
| ISSUE-004 | ExportModal lazy mount, 빈 clientId 안전 처리 |
| ISSUE-005 | iOS `limited` 연락처 권한 처리 추가 |
| ISSUE-006 | 날씨 모달 `useSafeAreaInsets` 전환 |

---

## 2026-05-31 — 기능 추가

- **TODO 수정**: 인라인 편집, TimePickerModal
- **홈 재구성**: 오늘 요약 위젯, 빠른 메뉴 가로 스크롤
- **수수료 토글**: % / 원 모드 전환, 순수익 실시간 계산
- **관리자 기능**: DB 관리 화면 (작물·품종·사이즈·단위·비용 CRUD)
- **Toast**: 저장/삭제 토스트 알림 컴포넌트

---

## 2026-05-27 — 초기 개발

- Expo SDK 56, TypeScript, Supabase 연동
- 기본 탭 구조: 홈·통계·입력·할 일·더보기
- AI 챗봇: Gemini 시도 → 지역 제한으로 Groq로 전환
  - 모델: `llama-3.1-8b-instant`, 하루 50회 앱 레벨 제한
  - 계정별 대화 기록 AsyncStorage 유지
- 날씨: OpenWeatherMap 연동, 시간별·주간·월별 예보
- 연락처 관리: 기기 가져오기, CRUD, 카카오톡 연동
- EAS 빌드 설정 (iOS / Android)

---

## 환경변수 전체 목록

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | supabase.com |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | supabase.com |
| `EXPO_PUBLIC_OPENWEATHER_API_KEY` | 날씨 API 키 | openweathermap.org |
| `EXPO_PUBLIC_GROQ_API_KEY` | AI 챗봇 API 키 | console.groq.com (무료) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web 클라이언트 ID | console.cloud.google.com |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth iOS 클라이언트 ID | console.cloud.google.com |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Google OAuth Android 클라이언트 ID | console.cloud.google.com |
| `EXPO_PUBLIC_KAKAO_REST_API_KEY` | 카카오 주소 검색 REST API 키 (선택) | developers.kakao.com |
