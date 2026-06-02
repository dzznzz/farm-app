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
