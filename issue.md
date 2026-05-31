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
`expo-modules-jsi`의 `apple/Package.swift`가 `swift-tools-version: 6.2`를 요구하는데,
기존 EAS 빌드 이미지(Xcode 16.2 / Swift 6.0.x)가 Swift 6.2를 미지원.

**중간 시도**
1. `react-native-maps` 제거 (미사용 패키지였으나 Google Maps SPM 의존성 유발) → 여전히 실패
2. Xcode 16.4 (`macos-sequoia-15.6-xcode-16.4`) 시도 → 여전히 실패 (Swift 6.1 포함)

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
`EXPO_PUBLIC_SUPABASE_URL` 등 환경변수가 `undefined` → Supabase 클라이언트 초기화 실패 → 크래시

**시도한 방법 (실패)**
`eas.json`에 API 키를 직접 기재 → GitHub Push Protection이 Groq API Key, OpenWeather API Key를 감지하여 push 차단

**해결**
EAS Secret에 환경변수 등록:
```bash
npx eas secret:push --scope project --env-file .env
```

---

## ✅ ISSUE-003 — 통계 탭 진입 시 앱 강제 종료 (1차)

**증상**: 통계 탭을 열면 즉시 앱 종료

**원인**
`BarChart` 컴포넌트에 `gradientColor={Colors.primaryLight}` prop이 있었으나,
해당 prop은 미설치된 `react-native-linear-gradient` 패키지를 내부적으로 require함

**해결**
`statistics.tsx`에서 `gradientColor`, `isAnimated` props 제거

**관련 커밋**: `4bc05fe`

---

## ✅ ISSUE-004 — 통계 탭 진입 시 앱 강제 종료 (2차)

**증상**: 이슈-003 해결 후에도 통계 탭에서 여전히 강제 종료

**원인**
`ExportModal`이 통계 화면에 항상 마운트되어 있고,
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`가 미설정이면 `webClientId: ''`로
`Google.useAuthRequest()` 훅이 호출됨.
내부적으로 `new AuthRequest({ clientId: '' })`가 `clientId is required` 에러를 throw → 앱 크래시

**해결**
1. `statistics.tsx`: `ExportModal`, `BreakdownModal`을 실제로 열 때만 마운트 (lazy mount)
   ```tsx
   {user && showExport && <ExportModal ... />}
   ```
2. `ExportModal.tsx`: 빈 `webClientId` 대신 placeholder 문자열 사용해 훅 초기화 안전하게 처리
   ```tsx
   webClientId: WEB_CLIENT_ID || '__not_configured__'
   ```

**관련 커밋**: `ec1f758`

---

## ✅ ISSUE-005 — 기기에서 연락처 가져오기 동작 안 함

**증상**:
- 첫 번째 탭: 연락처 선택 UI가 열리고 선택 후 확인해도 앱에 추가되지 않음
- 두 번째 탭: 아무 반응 없음

**원인**
iOS 14+에서 권한 요청 시 "전체 허용" 외에 "일부 허용(Select Contacts...)" 옵션이 있음.
사용자가 "일부 허용" 선택 시 `requestPermissionsAsync()`가 `'limited'` 반환.
기존 코드: `if (status !== 'granted') { return; }` → `'limited'` 인 경우 즉시 종료됨.

두 번째 탭 무반응: 이미 결정된 권한은 OS 다이얼로그를 다시 표시하지 않고 `'limited'` 즉시 반환 → 동일 조건으로 종료.

**추가 수정 (같은 커밋)**
일부 iOS 연락처에서 `name` 필드가 null이고 `firstName`, `lastName`만 존재하는 경우 필터링에서 제외되던 문제 → `firstName + lastName` 조합으로 fallback 처리

**해결**
```ts
if (status !== 'granted' && status !== 'limited') { ... }
```

**관련 커밋**: `4bc05fe`, `ec1f758`

---

## ✅ ISSUE-006 — 날씨 상세 화면에서 닫기 버튼이 배터리 잔량에 가려짐

**증상**: 날씨 모달 상단 닫기(✕) 버튼이 iOS 상태바(시간·배터리 영역) 뒤에 숨어 탭 불가

**원인**
React Native `Modal` 컴포넌트 내부에서 `SafeAreaView`(react-native-safe-area-context)가
상단 safe area inset을 정상 계산하지 못하는 iOS 버그

**해결**
`SafeAreaView` 제거 → `useSafeAreaInsets()` 훅으로 inset 값을 직접 읽어 헤더에 적용
```tsx
const insets = useSafeAreaInsets();
// LinearGradient에 적용
style={[styles.searchHeader, { paddingTop: insets.top }]}
```

**관련 커밋**: `4bc05fe`

---

## ⏳ ISSUE-007 — 수확·판매·기타 기록 수정/삭제 기능 미구현

**증상**: 잘못 입력한 수확·판매·기타 기록을 수정하거나 삭제하는 기능 없음

**현재 동작**: 입력 탭에서 저장 후 기록을 확인하거나 수정·삭제할 방법 없음

**계획**
- 입력 탭 각 하위 탭(수확/판매/기타) 하단에 최근 기록 목록 표시
- 각 기록에 ✏️ 수정 (폼 재사용, 기존 값 pre-fill), 🗑️ 삭제 (Alert 확인 후 삭제) 버튼 추가
- 저장·삭제 후 목록 자동 갱신

**관련 테이블**: `harvest_records`, `sales_records`, `other_records`

**우선순위**: 높음

---

## 참고 — 알려진 제약 사항

| 항목 | 내용 |
|---|---|
| 카카오톡 연동 | `kakaotalk://` 딥링크는 앱 열기만 가능, 특정 연락처 대화방으로 바로 이동 불가 (Kakao API 별도 등록 필요) |
| Google Sheets 내보내기 | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` 환경변수 미설정 시 버튼 탭 시 안내 메시지 표시 |
| 연락처 가져오기 | 웹(브라우저) 환경에서는 사용 불가, iOS/Android 전용 |
| 위치 기반 날씨 | 위치 권한 거부 시 서울 날씨로 자동 대체 |
