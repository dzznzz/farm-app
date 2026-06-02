# 작업 이력 (Work Log)

---

## 2026-06-02 — 주요 기능 개선 및 버그 수정

---

### 1. Google Sheets 내보내기 — 앱 크래시 수정

**문제**
- `@react-native-google-signin/google-signin` v16이 `google-services.json` 없이 네이티브에서 크래시

**해결**
- `expo-auth-session/providers/google` (브라우저 기반 OAuth2)로 완전 전환
- `exchangeCodeAsync` 수동 토큰 교환 구현 (expo-auth-session v5는 자동 교환 미지원)
- iOS 클라이언트 ID 사용 → reversed scheme redirect URI 자동 지원
- `extraParams: { prompt: 'select_account' }` 추가 → 내보내기 누를 때마다 계정 선택 강제

**수정 파일**
- `components/modals/ExportModal.tsx` — 전면 재작성
- `.env.example` — `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` 추가

---

### 2. Google Sheets 농장 컬럼 추가 + 스프레드시트 디자인

**추가 사항**
- `ExportRow` 인터페이스에 `farm_name: string` 필드 추가
- 헤더: 14컬럼 `일자 | 농장 | 작물 | 품종 | 사이즈 | 수확량 | 판매량 | 단가 | 매출 | 수수료율 | 수수료 | 부수비용 | 순수익 | 기타수량`
- 그룹 키: `date|farmId|cropType|variety|size`
- Sheets API `batchUpdate`로 디자인 적용:
  - 헤더 행: 짙은 초록 배경 + 흰 굵은 글씨 + 가운데 정렬 + 행 고정
  - 합계 행: 연한 노란 배경 + 굵게
  - 원화 컬럼(단가·매출·수수료·부수비용·순수익): `#,##0` 천 단위 포맷
  - 수수료율 컬럼: `0.0"%"` 포맷
  - 전체 컬럼 자동 너비 조정
  - 외곽 초록 굵은 테두리, 내부 회색 얇은 테두리

**수정 파일**
- `lib/googleSheets.ts` — 전면 재작성

---

### 3. 연락처 가져오기 — 네이티브 iOS 피커로 교체

**문제**
- 기존 `presentContactPickerAsync` deprecated 에러
- 1회 가져오기 후 추가 차단 로직, `deletedNamesRef` 비정상 동작

**해결**
- `Contact.presentPicker()` (class-based API, 권한 불필요) 사용
- 버튼 누를 때마다 iOS 시스템 연락처 피커 호출
- 중복 확인(이미 등록된 이름) 유지, 차단 로직 제거
- `deleteContact`에 누락됐던 `await loadContacts()` 추가

**수정 파일**
- `components/pages/ContactsPage.tsx` — 대폭 리팩터

---

### 4. TODO 알람 툴팁 레이아웃 깨짐 수정

**문제**
- 알람 아이콘 터치 시 툴팁이 normal flow에 렌더링되어 하단 바 높이 증가

**해결**
- `position: 'absolute', bottom: '100%'` 로 floating 처리
- 등록 모드(`showAlarmTooltip`)·수정 모드(`showEditAlarmTooltip`) 모두 적용

**수정 파일**
- `app/(tabs)/todo.tsx`

---

### 5. 농장 설정 페이지 전면 개선

**추가 기능**
- 최대 5개 농장 제한 (초과 시 "5개 최대" 표시 + 차단)
- 대표 농장 지정: `대표` 뱃지 표시, "대표 설정" 버튼으로 변경
- 첫 번째 농장 추가 시 자동으로 대표 농장 설정
- 농장 주소 필드 추가 (선택사항, 직접 입력 또는 카카오 주소 검색)
- 카카오 REST API 연동: `EXPO_PUBLIC_KAKAO_REST_API_KEY` 설정 시 검색 버튼 활성화
- 버튼 레이아웃 개선: "대표 설정" / "수정" / "삭제" 동일 너비(70px) 우측 하단 가로 정렬
- 농장 삭제 기능 추가

**수정 파일**
- `components/pages/FarmSettingsPage.tsx` — 전면 재작성
- `.env.example` — `EXPO_PUBLIC_KAKAO_REST_API_KEY` 추가

**DB 마이그레이션 필요** → `supabase/migrations/20260602_farms_add_columns.sql` 참고

---

### 6. 입력(수확/판매/기타) 등록·수정 — 농장 선택 step 추가

**변경 사항**
- 등록 step 흐름 변경:
  - 수확: `날짜 → 농장 → 작물 → 수확 내역`
  - 판매: `날짜 → 농장 → 작물 → 판매 내역 → 단가`
  - 기타: `날짜 → 농장 → 구분 → 작물 → 수량 내역`
- 수정 모드: 날짜 SectionCard와 농장 SectionCard 분리
- 대표 농장(`★` 표시) 기본 선택, 변경 가능
- 수정 저장 시 `farm_id` 함께 업데이트
- `input.tsx` farms 쿼리에 `is_primary` 필드 포함

**수정 파일**
- `components/modals/InputFormModal.tsx`
- `app/(tabs)/input.tsx`

---

### 7. 관리자 데이터 관리 — 모바일에서 조회 허용

**변경 사항**
- 관리자 계정이면 모바일에서도 "데이터 관리" 메뉴 표시
- 메뉴 배지: 모바일 → "관리자 메뉴 · PC에서만 수정 가능"
- 모바일로 진입 시:
  - 상단 노란 배너: "🖥️ PC에서만 수정이 가능합니다. 조회만 가능합니다."
  - 탭·입력·버튼 등 모든 인터랙션 차단 (`pointerEvents="none"`)
  - 뒤로 가기는 정상 동작

**수정 파일**
- `app/(tabs)/more.tsx`
- `components/pages/AdminDataPage.tsx`

---

## 수정된 파일 전체 목록

| 파일 | 변경 내용 |
|------|-----------|
| `components/modals/ExportModal.tsx` | Google OAuth 전환, 계정 선택 강제 |
| `components/modals/InputFormModal.tsx` | 농장 선택 step 추가, 수정 모드 farm_id 업데이트 |
| `components/pages/FarmSettingsPage.tsx` | 농장 설정 전면 개선 (대표·주소·제한·버튼) |
| `components/pages/ContactsPage.tsx` | 네이티브 iOS 피커, 중복 차단 개선 |
| `components/pages/AdminDataPage.tsx` | readOnly prop, 모바일 차단 배너 |
| `app/(tabs)/input.tsx` | farms 쿼리에 is_primary 추가 |
| `app/(tabs)/more.tsx` | 관리자 메뉴 모바일 표시 |
| `app/(tabs)/todo.tsx` | 알람 툴팁 absolute 포지셔닝 |
| `lib/googleSheets.ts` | 농장 컬럼, 스프레드시트 디자인 |
| `.env.example` | 환경 변수 3개 추가 |
