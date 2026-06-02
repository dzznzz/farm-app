# 이슈 관리

> 상태: ✅ 해결 | 🔧 진행 중 | ⏳ 미해결

---

## ✅ ISSUE-001 — iOS EAS 빌드 실패 (SPM 의존성 해석 오류)

**증상**
```
Could not resolve package dependencies
error: ExpoModulesJSI xcframework build failed
```

**원인**
`expo-modules-jsi`의 `Package.swift`가 `swift-tools-version: 6.2`를 요구하는데,
기존 EAS 빌드 이미지(Xcode 16.2 / Swift 6.0.x)가 Swift 6.2를 미지원.

**해결**
`eas.json` 빌드 이미지를 `macos-sequoia-15.6-xcode-26.2`(Swift 6.2)로 변경

```json
"image": "macos-sequoia-15.6-xcode-26.2"
```

**관련 커밋**: `050e0f0`, `047dbe0`, `b3192a2`

---

## ✅ ISSUE-002 — 빌드 성공 후 앱 실행 즉시 강제 종료

**증상**: EAS 빌드 후 QR 스캔/TestFlight 설치 → 앱 열리자마자 종료

**원인**
`.env` 파일이 `.gitignore`에 포함되어 EAS 빌드 환경에 없음.
환경변수가 `undefined` → Supabase 초기화 실패 → 크래시

**해결**
```bash
npx eas secret:push --scope project --env-file .env
```

---

## ✅ ISSUE-003 — 통계 탭 진입 시 앱 강제 종료 (1차)

**증상**: 통계 탭을 열면 즉시 앱 종료

**원인**
`BarChart`의 `gradientColor` prop이 미설치된 `react-native-linear-gradient`를 내부적으로 require함

**해결**
`statistics.tsx`에서 `gradientColor`, `isAnimated` props 제거

**관련 커밋**: `4bc05fe`

---

## ✅ ISSUE-004 — 통계 탭 진입 시 앱 강제 종료 (2차)

**증상**: ISSUE-003 해결 후에도 통계 탭에서 여전히 강제 종료

**원인**
`ExportModal`이 항상 마운트되어 있고 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`가 미설정이면
`Google.useAuthRequest({ clientId: '' })`가 `clientId is required` 에러 throw → 앱 크래시

**해결**
1. `statistics.tsx`: ExportModal을 실제로 열 때만 마운트 (lazy mount)
2. `ExportModal.tsx`: 빈 `clientId` 대신 `undefined` 처리

**관련 커밋**: `ec1f758`

---

## ✅ ISSUE-005 — 기기에서 연락처 가져오기 동작 안 함

**증상**: 첫 번째 탭: 선택 후 앱에 추가 안 됨 / 두 번째 탭: 아무 반응 없음

**원인**
iOS 14+ "일부 허용(Limited)" 권한 선택 시 `'limited'` 반환.
기존 코드: `if (status !== 'granted') return;` → `'limited'` 즉시 종료됨

**해결**
```ts
if (status !== 'granted' && status !== 'limited') { ... }
```

**관련 커밋**: `ec1f758`

---

## ✅ ISSUE-006 — 날씨 상세 화면에서 닫기 버튼이 배터리 잔량에 가려짐

**증상**: 날씨 모달 상단 닫기(✕) 버튼이 iOS 상태바 뒤에 숨어 탭 불가

**원인**
React Native `Modal` 내부에서 `SafeAreaView`가 상단 safe area inset을 정상 계산 못함

**해결**
`SafeAreaView` → `useSafeAreaInsets()` 훅으로 교체, `paddingTop: insets.top` 수동 적용

**관련 커밋**: `4bc05fe`

---

## ✅ ISSUE-007 — 수확·판매·기타 기록 수정/삭제 기능 미구현

**증상**: 잘못 입력한 기록을 수정·삭제하는 방법 없음

**해결**
- 입력 탭 목록에서 기록 탭 → `RecordDetailModal` 하단 시트
- ✏️ 수정: `InputFormModal` 재사용, 기존 값 pre-fill
- 🗑️ 삭제: "복구 불가" 경고 Alert 후 삭제

**관련 커밋**: `2532ef0`

---

## ✅ ISSUE-008 — Google Sheets 내보내기 앱 크래시 (native 모듈 누락)

**증상**: "구글 스프레드 시트로 내보내기" 버튼 탭 시 앱 강제 종료

**원인**
`@react-native-google-signin/google-signin` v16이 `google-services.json`(Android) /
`GoogleService-Info.plist`(iOS) 없이 네이티브 모듈 초기화 시 크래시

**해결**
`expo-auth-session/providers/google` (브라우저 기반 OAuth2) 로 완전 전환.
- `exchangeCodeAsync` 수동 토큰 교환 구현 (v5 자동 교환 미지원)
- iOS 네이티브 클라이언트 ID 사용 → reversed scheme redirect URI 자동 지원

**관련 커밋**: `3a56332`, `a309f3b`

---

## ✅ ISSUE-009 — 연락처 가져오기 deprecated API 오류

**증상**: 기기에서 가져오기 버튼 탭 시 `presentContactPickerAsync is deprecated` 에러

**원인**
expo-contacts v56에서 `presentContactPickerAsync` 함수 deprecated.
class-based API(`Contact.presentPicker()`)로 전환 필요.

**해결**
`Contact.presentPicker()` 사용 — iOS 시스템 연락처 피커 호출, 권한 불필요(CNContactPickerViewController)

**관련 커밋**: `a309f3b`

---

## ✅ ISSUE-010 — TODO 알람 아이콘 툴팁이 하단 바를 밀어냄

**증상**: TODO 작성/수정 화면에서 알람 아이콘 탭 시 툴팁이 normal flow로 렌더링되어 하단 저장 버튼 영역 높이 증가 → UI 레이아웃 깨짐

**원인**
툴팁 View가 `position: relative` 부모 안에서 일반 흐름에 포함됨

**해결**
`position: 'absolute', bottom: '100%'` 로 float 처리 (등록/수정 모드 모두 적용)

**관련 커밋**: `a309f3b`

---

## ✅ ISSUE-011 — 입력 수정 모드에서 원래 농장 미복원

**증상**: 수확/판매/기타 기록 수정 시 원래 기록의 농장이 아닌 대표 농장이 항상 기본 선택됨

**원인**
`DisplayRecord`에 `farmId` 필드가 없어 기록 조회 시 어느 농장의 기록인지 알 수 없었음

**해결**
- `DisplayRecord`에 `farmId`, `farmName` 필드 추가
- 모든 record 쿼리에 `farm_id` 포함
- 수정 모드 `useEffect`에서 `editRecord.farmId`로 `setFarmId` 호출

**관련 커밋**: `49135bb`

---

## ✅ ISSUE-012 — 데이터 관리 탭 PC/웹에서 원형 렌더링

**증상**: 더보기 → 데이터 관리 탭(작물/품종/사이즈/단위/비용) 선택 영역이 큰 원형 도형으로 깨짐

**원인**
`ScrollView horizontal`의 `contentContainerStyle`에 `borderRadius: Radius.full`이 지정됨.
PC/웹 환경에서는 contentContainerStyle이 별도 div로 렌더링되어 `border-radius: 9999px`가 적용 → 내부 콘텐츠 높이 기준으로 원형 클리핑 발생

**해결**
`ScrollView horizontal` → `View`로 교체. `borderRadius: Radius.full`을 View의 style에 직접 적용(`tabsRow` 스타일).
5개 탭은 스크롤 없이 고정이므로 ScrollView 불필요.

**관련 커밋**: `614d1af`

---

## ✅ ISSUE-013 — 농장 뱃지가 첫 로드 시 표시 안 됨

**증상**: 입력 탭 레코드 카드에 농장 뱃지가 보이지 않음

**원인**
`farms` 로드와 `loadRecords` 실행이 동시에 트리거됨. `loadRecords`가 먼저 완료되면
`farms` state가 아직 `[]`이라 `getFarmName()` 함수가 항상 `null` 반환 → `farmName: null`로 저장됨.

**해결**
레코드 로드 시점에 farmName을 저장하는 방식 → 렌더 시점에 `farms` state를 참조하는 방식으로 변경:
```tsx
const fn = r.farmName ?? farms.find(f => f.id === r.farmId)?.name;
```
`r.farmName`이 null이어도 현재 `farms`에서 실시간 조회.

**관련 커밋**: `614d1af`

---

## ✅ ISSUE-014 — 단가 히스토리 항상 비어 있음

**증상**: 통계 페이지에 "최근 판매 단가" 섹션이 나타나지 않음

**원인**
`fetchPriceHistory`가 현재 선택된 기간(`curFrom~curTo`)으로만 조회.
일별 모드에서는 오늘 하루만 조회 → 오늘 판매가 없으면 빈 배열 → 섹션 숨김.

**해결**
기간 탭과 무관하게 항상 최근 30일 고정 조회:
```typescript
const d30 = new Date(); d30.setDate(d30.getDate() - 30);
fetchPriceHistory(user.id, d30.toISOString().split('T')[0], today, selectedFarmId)
```

**관련 커밋**: `614d1af`

---

## 참고 — 알려진 제약 사항

| 항목 | 내용 |
|---|---|
| 카카오톡 연동 | `kakaotalk://` 딥링크는 앱 열기만 가능, 특정 대화방 바로가기는 Kakao API 별도 등록 필요 |
| Google Sheets Android | `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` 설정 필요, 미설정 시 Android에서 내보내기 불가 |
| 연락처 가져오기 | 웹(브라우저) 환경에서는 사용 불가, iOS/Android 전용 |
| 위치 기반 날씨 | 위치 권한 거부 시 서울 날씨로 자동 대체 |
| 카카오 주소 검색 | `EXPO_PUBLIC_KAKAO_REST_API_KEY` 미설정 시 주소 직접 입력만 가능 |
| 인건비 통계 필터 | `labor_records`에 `farm_id` 미포함으로 농장 필터 적용 시 인건비는 전체 합계가 표시됨 |
