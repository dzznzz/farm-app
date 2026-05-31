# 개발 이력

---

## 2026-06-01 (오늘)

### 버그 수정 3차 — 통계 크래시, 연락처 limited 권한

**커밋**: `ec1f758` fix: 통계 화면 크래시, 연락처 limited 권한 처리

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/statistics.tsx` | BreakdownModal / ExportModal을 필요할 때만 마운트 (lazy mount) |
| `components/modals/ExportModal.tsx` | 빈 webClientId로 `useAuthRequest` 호출 시 크래시 방지 |
| `components/pages/ContactsPage.tsx` | iOS 14+ `limited` 연락처 권한을 `granted`와 동일하게 처리 |

**원인 분석**:
- 통계 크래시: `ExportModal`이 통계 화면에 항상 마운트되며 `Google.useAuthRequest({ webClientId: '' })`를 호출. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`가 미설정이면 빈 문자열이 되어 내부에서 `clientId is required` 에러 발생 → 앱 강제 종료
- 연락처 무반응: iOS 14+에서 "일부 허용(Limited Access)" 선택 시 권한 status가 `'limited'`로 반환. 기존 코드는 `'granted'`만 허용하여 조용히 종료됨

---

### 버그 수정 2차 — iOS 빌드 후 런타임 크래시 3종

**커밋**: `4bc05fe` fix: statistics crash, contacts import, weather modal close button

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/statistics.tsx` | BarChart에서 `gradientColor`, `isAnimated` props 제거 |
| `components/modals/WeatherModal.tsx` | `SafeAreaView` → `useSafeAreaInsets` 훅으로 교체, 헤더에 `paddingTop: insets.top` 수동 적용 |
| `components/pages/ContactsPage.tsx` | iOS 연락처 `name` 필드 null 처리, `firstName + lastName` 폴백 추가, 빈 결과 안내 메시지 추가 |

**원인 분석**:
- 통계 크래시: `BarChart`의 `gradientColor` prop이 미설치된 `react-native-linear-gradient`를 필요로 함
- 날씨 모달 닫기 버튼 가림: `Modal` 내부에서 `SafeAreaView`가 iOS 상단 inset을 제대로 적용하지 않음
- 연락처 가져오기 실패: iOS가 `name` 필드 대신 `firstName` / `lastName`을 분리 저장하는 경우 존재

---

### iOS EAS 빌드 실패 해결

**커밋**: `b3192a2` fix: use Xcode 26.2 image for Swift 6.2 support

| 커밋 | 내용 |
|---|---|
| `050e0f0` | `react-native-maps` 제거 — 미사용 패키지가 Google Maps iOS SDK SPM 의존성 유발 |
| `047dbe0` | EAS 빌드 이미지 → Xcode 16.4 시도 (실패) |
| `b3192a2` | EAS 빌드 이미지 → `macos-sequoia-15.6-xcode-26.2` (Xcode 26.x / Swift 6.2) 로 최종 변경 |

**근본 원인**: `expo-modules-jsi`의 `Package.swift`가 `swift-tools-version: 6.2`를 요구하여 Swift 6.0/6.1이 포함된 Xcode 16.x에서 SPM 의존성 해석 실패. Xcode 26.x (Swift 6.2) 이미지로 전환해야 빌드 성공.

---

### 아이콘 변경

**커밋**: `a17d23f` 아이콘 변경

- `assets/icon.png` 교체

---

## 2026-05-31 (어제)

### TODO 수정 기능 + 사이즈 직접 입력

**커밋**: `408709a` feat: TODO 수정 기능 + 사이즈 직접 입력 버튼

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/todo.tsx` | 각 항목에 ✏️ 수정 버튼 추가, 인라인 편집(텍스트+시간) 후 저장/취소 |
| `app/(tabs)/todo.tsx` | 수정 시 TimePickerModal로 시간 변경 가능 |
| `app/(tabs)/input.tsx` | 사이즈 칩 끝에 **직접 입력** 버튼 추가, 선택 시에만 TextInput 표시 |

---

### 홈 위젯 재구성, 수수료 토글, 순수익 통계, 시간 피커

**커밋**: `a6ab8a2` feat: 홈 위젯 재구성, 수수료 토글, 순수익 통계, 시간 피커

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/index.tsx` | 홈 화면 레이아웃: 할 일 위젯 → 오늘 요약 → 날씨 → 빠른 메뉴 순서로 재구성 |
| `app/(tabs)/index.tsx` | 빠른 메뉴 버튼 가로 스크롤, 수확/판매/통계/연락처/챗봇 5개 버튼 |
| `app/(tabs)/input.tsx` | URL tab 파라미터로 탭 자동 선택 (`?tab=harvest`, `?tab=sales`) |
| `app/(tabs)/input.tsx` | 판매 수수료 % / 원 모드 토글 추가 |
| `app/(tabs)/statistics.tsx` | DailyStat에 netRevenue 추가, 총 순수익 카드 (2×2 그리드) |
| `components/modals/TimePickerModal.tsx` | 시/분 선택 UI 모달 신규 추가 |
| `hooks/useStats.ts` | netRevenue 집계 로직 추가 |
| `types/index.ts` | DailyStat.netRevenue 타입 추가 |

---

### TODO 개선, Toast 알림, 수수료/부수비용 입력

**커밋**: `6a827e9` feat: TODO 개선, 저장/삭제 toast 알림, 수수료/부수비용 입력

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/todo.tsx` | 삭제 버튼 직접 삭제(Alert 제거), 시간 필드 추가(시간순 정렬), 완료 항목 일괄 삭제 |
| `app/(tabs)/input.tsx` | 판매 입력에 수수료(%), 부수비용(원) 추가, 순수익 실시간 계산 표시 |
| `components/pages/AdminDataPage.tsx` | 비용유형(expense_types) 5번째 탭 추가, 삭제 Alert 제거 |
| `components/ui/Toast.tsx` | Toast 컴포넌트 신규 추가 (useToast hook 포함) |
| `supabase_migration_006.sql` | todos.time 컬럼 추가 마이그레이션 |

---

### TODO 탭, 날씨 위젯, Google Sheets 내보내기

**커밋**: `f503117` feat: TODO 탭, 수수료/부수비용, 날씨 위젯, Google Sheets 내보내기

주요 추가 기능:
- **할 일(TODO) 탭** 신규 추가 (홈 다음 탭)
- **날씨 상세 모달**: 시간별·주간 예보, 월별 평균 기온, 농업 계절 가이드
- **Google Sheets 내보내기**: Google OAuth 인증 후 월간 데이터를 스프레드시트로 내보내기
- **판매 수수료·부수비용** 입력 필드 및 순수익 계산

---

### 컴포넌트 분리, 관리자 기능, 통계 상세 분석

**커밋**: `6cda2d8` feat: 컴포넌트 분리, 관리자 기능, 통계 상세 분석, UI 개선

주요 변경:
- 대형 파일을 `components/modals/`, `components/pages/`로 분리
- **관리자 전용** DB 관리 화면 (작물·품종·사이즈·단위·비용유형 CRUD)
- **작물·품종·사이즈별 상세 분석** 모달 (BreakdownModal)
- `supabase_migration_004.sql`: profiles.role 컬럼 추가
- DB 마스터 테이블 생성: crop_types, varieties_master, sizes_master, harvest_units

---

## 2026-05-27 (초기 개발)

**커밋**: `c9ccd65` feat: 농장관리 앱 초기 구현 (Expo+Supabase+Gemini)

초기 구현:
- Expo 프로젝트 세팅 (SDK 56, TypeScript)
- Supabase 연동 (인증, 데이터베이스)
- 기본 탭 구조: 홈, 통계, 입력, 더보기
- AI 챗봇 (Gemini → Groq 전환)
- 날씨 API (OpenWeatherMap)
- 연락처 관리
- EAS 빌드 설정 (Android APK, iOS TestFlight)
