# TO-BE — UI 개선 로드맵

앱(수확/판매 기록 + 통계)에 자연스럽게 어울리고, 요즘 앱에서 많이 쓰는 UI 요소들을 **효과 대비 작업량** 기준으로 정리한 문서입니다.

---

## 바로 체감되는 것 (작업량 적음)

### 1. 숫자 카운트업 애니메이션 ✅
- 요약 카드(수확량 / 매출 / 순수익)가 0에서 실제 값까지 또르륵 올라가는 효과.
- 통계 화면 첫인상이 크게 살아남.
- 구현: Reanimated 또는 `Animated`.
- 06/17 적용 완료. 

### 2. 스켈레톤 로더 (shimmer) ✅
- 현재 `ActivityIndicator`(빙글 스피너) 대신, 카드 모양의 회색 깜빡임 자리표시.
- 요즘 거의 표준 패턴.
- 06/17 적용 완료. 

### 3. Pull-to-refresh ✅
- 통계 / 입력 화면을 아래로 당겨서 새로고침 (`RefreshControl`).
- 거의 모든 데이터 앱에 존재.
- 06/17 적용 완료. 

### 4. Haptic 피드백 ✅
- 탭 전환·버튼 누를 때 미세한 진동 (`expo-haptics`).
- native에서 고급스러운 느낌.
- 06/18 적용 완료. (`lib/haptics.ts` 헬퍼 + 하단 탭/버튼/입력 탭·FAB·저장·삭제에 연동, web no-op)

---

## 구조를 약간 바꾸는 것 (중간)

### 5. 카드 누를 때 살짝 눌리는 효과 (press scale) ✅
- 탭 / 카드에 `scale: 0.97` 애니메이션.
- 터치 반응성이 좋아 보임.
- 06/18 적용 완료. (`components/ui/PressableScale.tsx` 드롭인 + 햅틱 통합, 홈 요약 카드·빠른 메뉴·공용 Button에 연동)

### 6. 차트 인터랙션 ✅
- 도넛 조각이나 막대를 탭하면 해당 항목 상세(툴팁 / 하이라이트)가 뜨도록.
- 06/18 적용 완료. (도넛: 조각·항목표 탭 → 중앙에 선택 항목명/수량/비율 + 조각 강조 / 막대: 탭 → 행 하이라이트 + 하단 상세 툴팁(값·전체 대비 비율), 한 번 더 탭하면 해제)

### 7. 바텀시트 모달 ✅(부분)
- 현재 전체화면 Modal(날씨 · 입력 폼) 대신 아래에서 올라오는 시트.
- `@gorhom/bottom-sheet` 또는 `@expo/ui`의 BottomSheet.
- iOS 네이티브 느낌.
- 06/18 적용. 추가 패키지 없이 `components/ui/BottomSheet.tsx`(RN Modal+Animated+PanResponder, 핸들 드래그/딤 탭으로 닫힘, web/native 공용) 신규.
  - 선택 모달(`SelectModal`)·시간 선택(`TimePickerModal`)을 바텀시트로 전환.
  - **보류:** 입력 폼(키보드 가림 이슈)·날씨(콘텐츠량 많아 거의 풀스크린)는 현행 유지 — 추후 키보드 회피 처리 후 검토. 캘린더는 중앙 다이얼로그가 더 자연스러워 유지.

---

## 더 큰 작업

### 8. Toast / Snackbar ✅
- 저장·삭제 후 `Alert` 대신 하단에 살짝 뜨는 알림.
- 06/18 적용. 전역 `ToastProvider` + `useToast()`(success/error/info, 아이콘·색 구분, 하단 슬라이드업). 루트 레이아웃에 Provider 배치.
  - 기존 로컬 토스트(`todo`, `AdminDataPage`)를 전역으로 통합, 입력 저장·삭제도 토스트로 연결.

---

## 수정 작업

### 9. 관리자 메뉴 > 데이터 관리 ✅
- 공통 코드 테이블 (common_code) 구조 기준으로 수정 메뉴 전면 수정
- 항목(MAIN_CODE)을 상단에 탭으로 표시하여 선택하도록 하지 않고 추가 input 위에 선택지(select와 비슷한 방식)로 항목(MAIN_CODE) 전체 표시
- 06/18 적용. 상단 5개 탭 제거 → 단일 화면으로 통합. 추가 input 위에 "관리 항목" select(바텀시트 `SelectModal` 재사용)로 MAIN_CODE(작물/품종/사이즈/단위/비용) 전체를 노출해 선택. 부모 코드가 있는 품종·사이즈는 부모 작물도 동일한 select 형식으로 선택. MAIN_META로 항목별 메타(라벨·placeholder·부모·범위입력) 일원화.

### 10. 입력 ✅
- 수확 & 판매 & 기타 에서 등록 버튼 (+) 클릭한 후 bottomsheet 창에서, 내역 입력 단계 수정
- 현재 품종, 사이즈 선택 창을 삭제
- 빈 내역 박스에 + 버튼 표시, + 버튼 클릭하면 상세내용 입력 모달 창 오픈 (품종, 사이즈, 수량, 단가 등 입력)
- 저장하고 모달창이 닫히면 +버튼 하위로 기존 정렬 기준으로 정렬되어 출력
- 06/18 적용. 내역 단계의 품종·사이즈 칩 선택 UI 삭제 → "+ 내역 추가" 박스 버튼 + 통합 상세 모달(`EntryDetailModal`: 품종·사이즈·수량·단가 한 번에 입력) 도입. 저장 시 sortEntries(품종→사이즈)로 정렬되어 + 버튼 하위에 표시. 기존 `SizeEntryModal` 대체.

### 11. 거래처 관리 ✅
- 농장 관리와 비슷한 UI로 관리
- 온라인/오프라인 여부, 수수료 항목 추가
- 정보 변경 시 과거 기록 유지
- 판매 입력 시 온라인/오프라인 선택 여부에 따라 구매자 영역에 선택지로 출력
- 06/18 적용. `clients` 테이블 신설(마이그레이션 014) + `lib/clients.ts` 헬퍼 + `ClientsPage`(농장 설정과 동일 패턴 CRUD: 이름·채널·수수료 율%/금액원). 더보기 메뉴에 "거래처 관리" 추가.
  - 판매 입력: 판매 유형이 온라인/오프라인이면 구매자 영역이 해당 채널 거래처 select(직접 입력 허용)로 바뀌고, 거래처 선택 시 수수료 자동 채움.
  - 과거 기록 유지: 판매 기록은 입력 당시 수수료·구매자명을 그대로 보관하므로 거래처 수정이 과거 기록/통계에 영향 없음.
  - ⚠️ 적용하려면 Supabase에 `supabase_migration_014_clients.sql` 실행 필요.

### 12. 최근 판매 단가 ✅
- 더보기>데이터관리 에서 사용했던 selectbox를 활용해서 작물, 품종, 사이즈 3가지를 구분해서 선택 하도록 바꿔줘.
- 06/24 적용. 통합 칩 필터 제거 → 작물·품종·사이즈 3개 select 버튼(데이터관리의 `SelectModal` 재사용)으로 분리. cascading 선택(작물 선택 시 하위 옵션 좁힘·초기화), 각 항목 "전체" 옵션 제공. `PricePoint`에 crop/variety/size 필드 추가.

### 13. 입력 > 수확 ✅
- 내역 출력할 때, 판매/기타 처럼 품종별로 folding 처리해줘.
- 접혀있을 때도 품종별 소계, 전체 총계는 보이게 해줘. 
- 06/24 적용. 수확/기타 그룹 카드의 품종 블록을 판매와 동일한 접기/펼치기 헤더로 전환(`expandedVarieties`/`toggleVariety` 재사용, 기본 접힘). 헤더에 품종 소계(+기타는 부수비용) 항상 표시, 펼치면 사이즈별 상세 행 노출. 전체 합계 행은 접힘 여부와 무관하게 유지.

## 14. 에러 수정 ✅
- 06/24 수정. 원인: 웹 도넛 차트 `Circle`에 `onPress`를 주면 react-native-svg WebShape가 터치 responder 핸들러(`onResponderTerminate` 등)를 DOM `<circle>`에 그대로 내려보내 react-dom이 경고. → 웹 분기에서 `onPress` 대신 DOM `onClick`(+cursor:pointer) 사용으로 변경(`hasTouchableProperty`가 false가 되어 responder 핸들러 미부착).
- 화면 조회하면 계속 이 에러메시지 console에 찍히는데 확인해줘.
```
Unknown event handler property `onResponderTerminate`. It will be ignored.
Component Stack
19

circle
<anonymous>
createElement
node_modules/react-native-web/dist/exports/createElement/index.js
render
node_modules/react-native-svg/lib/module/web/WebShape.js
pieData.map$argument_0
app/(tabs)/statistics.tsx
Call Stack
16

addLog
node_modules/@expo/log-box/src/Data/LogBoxData.tsx
consoleErrorMiddleware
node_modules/@expo/log-box/src/LogBox.ts
console.error
node_modules/@expo/log-box/src/LogBox.ts
validateProperty
node_modules/react-dom/cjs/react-dom-client.development.js
warnUnknownProperties
node_modules/react-dom/cjs/react-dom-client.development.js
validatePropertiesInDevelopment
node_modules/react-dom/cjs/react-dom-client.development.js
setInitialProperties
node_modules/react-dom/cjs/react-dom-client.development.js
completeWork
node_modules/react-dom/cjs/react-dom-client.development.js
runWithFiberInDEV
node_modules/react-dom/cjs/react-dom-client.development.js
completeUnitOfWork
node_modules/react-dom/cjs/react-dom-client.development.js
performUnitOfWork
node_modules/react-dom/cjs/react-dom-client.development.js
workLoopSync
node_modules/react-dom/cjs/react-dom-client.development.js
renderRootSync
node_modules/react-dom/cjs/react-dom-client.development.js
performWorkOnRoot
node_modules/react-dom/cjs/react-dom-client.development.js
performWorkOnRootViaSchedulerTask
node_modules/react-dom/cjs/react-dom-client.development.js
performWorkUntilDeadline
node_modules/scheduler/cjs/scheduler.development.js
```

### 15. 날씨 상세 모달 ✅
- 시간별 예보가 화면 오른쪽으로 넘어가서 안보이면 좌우로 움직여서 볼 수 있게 해줘.
- 06/24 적용. 웹에서 시간별 예보를 고정 flex-row(`hourlyRowWeb`)로 욱여넣어 우측이 잘리던 문제 → 네이티브와 동일하게 가로 `ScrollView`로 통일(웹은 스크롤바 표시). 좌우 스크롤로 전체 시간대 조회 가능.

### 16. 탭 이동 ✅
- 탭을 이동했을 때, 현재는 해당 탭을 마지막에 보고있던 화면을 출력
- 해당 탭에 최초 접근했을 때 화면으로 초기화하여 출력
- '할 일' 탭 처럼 입력된 값이 저장되기 전에 탭 이동이 가능한 화면에서는 입력한 정보가 저장되지 않는다는 안내 문구 띄우고 확인을 누르면 이동하도록 처리
- 06/25 적용. 각 탭이 blur(탭을 떠날 때)에 `useFocusEffect` 클린업으로 화면 상태를 최초 진입 상태로 초기화 → 재진입 시 항상 초기 화면 출력.
  - 더보기: 하위 페이지(챗봇/농장설정 등) → `menu`로 / 통계: 기간·날짜·차트/도넛 탭·농장 필터·판매단가 select·열린 모달 초기화 / 입력: 오늘·수확 탭·열린 모달·folding 초기화 / 할 일: 오늘·입력 칸·수정 상태 초기화.
  - 저장 전 입력 경고: `lib/tabLeaveGuard.ts`(모듈 레지스트리 + `useTabLeaveGuard` 훅) 신설. 탭 레이아웃 `screenListeners.tabPress`에서 현재 탭의 가드를 조회해 미저장 입력이 있으면 `e.preventDefault()` 후 확인 다이얼로그 → "이동" 시에만 `navigation.navigate`로 이동. '할 일' 탭이 추가 칸 텍스트 or 수정 중일 때 가드 등록.

### 17. 날씨 상세 모달 ✅
- 시간별 예보가 화면 전체 너비에 맞춰서 개수만큼 분할해서 표현해주고, 현재 최소값 min-width: 72px; 은 유지해줘.
- 최소 값으로 출력했는데도 화면을 넘치게 되면 좌우로 움직여서 확인할 수 있게 처리해줘.
- 06/25 적용. `useWindowDimensions`로 가용 너비(화면폭 − 좌우 패딩)를 계산해 시간 카드 폭 = `max(72, (가용폭 − 간격합) / 개수)`로 균등 분할. 개수가 적으면 전체 너비를 꽉 채우고, 최소 72px로도 넘치면 기존 가로 `ScrollView`로 좌우 스크롤되어 전체 시간대 확인 가능. (`Card` style 타입을 `StyleProp<ViewStyle>`로 확장해 인라인 폭 오버라이드 허용.)
- 06/25 보완. 넘칠 때만 `scrollEnabled` ON → 화면에 다 들어오면(웹 창을 넓혔을 때 등) 스크롤/스크롤바가 사라지도록 처리. 스크롤바는 넘치는 웹에서만 표시(`overflow && web`)하고 앱/모바일에서는 항상 숨김. 카드 폭은 `Math.floor`로 내림해 1px 넘침으로 인한 스크롤바 발생 방지.

### 18. 통계 > 최근 판매 단가 ✅
- 통계 구분(일별/주별/월별/연별)에 따라 출력 값 변경
- 판매 가격이 없는 기간도 0원으로 표시
1) 일별 : 조회 일 기준으로 -3일 ~ +3일까지 표시
2) 주별 : 조회 주 기준으로 -3주 ~ +3주까지 표시 (선택한 작물/품종/사이즈의 주별 평균 값)
3) 월별 : 조회 월 기준으로 -3월 ~ +3주까지 표시 (선택한 작물/품종/사이즈의 월별 평균 값)
4) 연별 : 조회 연 기준으로 -3년 ~ +3년까지 표시 (선택한 작물/품종/사이즈의 연별 평균 값)
- 06/25 적용. 고정 "최근 7일" → 선택 기간 기준 **-3 ~ +3 구간(총 7개 버킷)** 으로 전환. `getPriceBuckets`/`getPriceRange`(statistics.tsx)로 일/주/월/연 버킷 키·라벨·조회범위 계산. `fetchPriceHistory`는 해당 범위의 원시 판매 데이터를 가져오고(내림차순 limit100 → 오름차순 limit2000), 컴포넌트에서 선택한 작물/품종/사이즈 필터 적용 후 버킷별 **평균 단가**로 집계. 판매 없는 버킷은 0원으로 채워 항상 7포인트 출력. 카드 제목/캡션도 기간 기준 안내로 갱신.

### 19. 통계 > 수확량 추이 ✅
- 선택한 기간 클릭 시 출력 값 변경
 ex>
[AS-IS] 6/19 271kg 전체의 46.5%
[TO-BE] 6/19 전체 271kg [블루베리-수지블루] 왕특 113kg, 왕왕특 113kg, 특 42kg 등
- 06/25 적용. 막대(기간) 선택 시 단일 줄 툴팁 → **작물-품종 그룹 → 사이즈별 상세** 패널로 확장. `fetchTrendDetail`(useStats)로 막대 범위의 원시 수확/판매 내역(작물·품종·사이즈·값)을 가져와 `trendDetail` state 보관. 선택 막대의 버킷 키(`periodKeyOf`로 일/주/월/연 매칭)에 해당하는 행만 필터→ 작물-품종별 소계·사이즈별 값으로 그룹핑. 헤더 "라벨 전체 N · 전체의 X%", 그룹별 "[작물-품종] 소계 / 사이즈 값, 값…". 수확/매출 탭에 따라 kg/원 단위 자동 전환.

### 20. 더보기 > 농장 설정 ✅(관리 기능 + DB 기반)
- 농장 등록 시 관리자 계정 설정 (최초 등록자 계정)
- 농장 설정 메뉴에서 농장 이름 or 주소 로 DB에서 LIKE 검색하여 농장 조회
- 선택한 농장의 권한 신청 버튼을 누르면, 해당 농장의 데이터를 조회/입력 할 수 있는 권한 부여됨
- 계정별 권한은 농장주 or 구성원, 하나의 계정이 여러 농장의 농장주가 될 수 있음
- 농장주인 계정일 때, 더보기 > 농장 관리 메뉴에서 권한신청 승인/반려, 구성원 삭제, 농장주 승계할 수 있음
- 06/25 적용. **마이그레이션 015**(`supabase_migration_015_farm_sharing.sql`) 신설:
  - `farm_members`(owner/member), `farm_join_requests`(pending/approved/rejected) 테이블 + farms INSERT 트리거로 **최초 등록자 자동 농장주** 등록(+기존 농장 백필).
  - `is_farm_member`/`is_farm_owner`(SECURITY DEFINER)와 RPC(`search_farms`·`request_farm_join`·`approve/reject_join_request`·`remove_farm_member`·`transfer_farm_ownership`·`owner_pending_requests`·`farm_members_detail`).
  - **권한 모델**: 구성원은 데이터 *조회 전체*(데이터 테이블에 `*_farm_member_read` SELECT 정책 추가)·*입력 전체*(기존 본인 user_id INSERT 정책 활용)·*수정/삭제는 본인 것만*(기존 정책 유지). 기존 정책은 건드리지 않고 SELECT만 OR로 추가해 단일 사용자 동작 보존.
  - 앱: `lib/farmAccess.ts` 헬퍼 / `FarmSettingsPage`에 **농장 검색·권한 신청** + 참여 중인 농장 목록 추가 / **`FarmManagePage`(농장 관리)** 신설(권한 신청 승인·반려, 구성원 삭제, 농장주 승계) / 더보기 메뉴에 농장주일 때만 "농장 관리" 노출(`myOwnedFarmCount`).
  - ⚠️ 적용하려면 Supabase에 `supabase_migration_015_farm_sharing.sql` 실행 필요.
  - 🔜 후속(별도 작업): 입력/통계/홈/할일/useStats의 데이터 조회를 user_id 기준 → 농장 멤버십 기준으로 재배선해야 구성원이 공유 농장 데이터를 화면에서 실제로 보고 입력할 수 있음. (DB/RLS 기반은 이미 준비됨)

### 21. 농장 멤버십 구조 변경 ✅
- 입력/통계/홈/useStats의 데이터 조회를 농장 멤버십 기준으로 재배선
- 할일 : 입력할 때, 구분을 하나 추가해서 개인 (계정만 보이는 할일), 구성원 (농장 구성원 전체에게 보이는 할일)로 구분해서 입력하고 구분에 따라 조회되게 해줘.
- 06/26 적용.
  - **데이터 조회 재배선**: `lib/farmAccess.ts`에 `accessibleFarmIds(소유+참여 농장 ID)`·`myFarms(소유+참여 농장 목록, 대표 우선)` 추가. `hooks/useStats.ts`의 모든 조회 함수(`fetchPeriodSummary(ForRange)`·`fetchStatsForRange`·`fetchBreakdown`·`fetchPriceHistory`·`fetchTrendDetail`·`fetchSummary`·`useStats`)를 `applyScope`로 통일 — **특정 농장 선택 시 그 농장 전체(구성원 데이터 포함)**, 미선택 시 **접근 가능 농장 전체 + 본인 농장 미지정(farm_id null) 기록**, 둘 다 없으면 기존처럼 본인만. (RLS 015가 구성원 조회 허용)
  - **통계/홈**: 농장 필터·요약 집계를 `myFarms`/`accessibleFarmIds` 기준으로 전환(소유만 → 소유+참여). `BreakdownModal`도 `farmIds` 전달.
  - **입력**: 농장 선택지를 `myFarms`로, 일별 내역을 접근 가능 농장 범위로 조회(구성원 기록 함께 표시). `DisplayRecord.ownerId` 추가 → **본인 것만 수정·삭제** 버튼 노출, 타 구성원 기록은 "구성원" 배지로 읽기 전용 표시.
  - **할 일 개인/구성원**: **마이그레이션 016**(`supabase_migration_016_todo_scope.sql`) — `todos`에 `scope('personal'|'shared')`·`farm_id` 추가, `scope='shared'`면 `farm_id` 필수(CHECK), RLS를 세분화(조회/수정/삭제는 본인 것 + 내가 속한 농장의 공유 할 일=협업형, 입력은 본인 user_id·공유면 구성원 농장만). 할 일 탭에 개인/구성원 토글 + (농장 2개 이상이면) 공유 농장 select(기본 대표농장) 추가. 공유 할 일엔 "구성원 · 작성자명" 배지 표시. 홈 위젯도 공유 할 일 함께 노출.
  - ⚠️ 적용하려면 Supabase에 `supabase_migration_016_todo_scope.sql` 실행 필요.

