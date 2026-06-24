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

## 2026-06-24 — 20차 작업 (TO-BE 12~15)

### TO-BE 로드맵 12~15 적용 — 판매 단가 select 분리 · 수확 folding · 도넛 에러 · 날씨 스크롤

**12. 최근 판매 단가 select 분리 (`statistics.tsx`, `hooks/useStats.ts`)**
- 기존 "작물 품종 사이즈" 통합 칩 필터 제거 → **작물·품종·사이즈 3개 select 버튼**(데이터관리의 `SelectModal` 재사용)으로 분리.
- cascading: 작물 선택 시 품종·사이즈 옵션이 좁혀지고 하위 선택 초기화. 각 항목에 "전체" 옵션 제공.
- `PricePoint`에 `crop`/`variety`/`size` 필드 추가(기존 `label`은 유지).

**13. 입력 > 수확 품종별 folding (`input.tsx`)**
- 수확/기타 그룹 카드의 품종 블록을 판매와 동일한 **접기/펼치기 헤더**로 전환(`expandedVarieties`/`toggleVariety` 재사용, 기본 접힘).
- 헤더에 **품종 소계**(기타 탭은 부수비용 포함)를 항상 표시 → 접혀 있어도 소계 확인 가능. 펼치면 사이즈별 상세 행 노출.
- **전체 합계** 행은 접힘 여부와 무관하게 그대로 유지.

**14. 통계 화면 콘솔 에러 수정 (`statistics.tsx`)**
- 증상: `Unknown event handler property 'onResponderTerminate'` 경고가 화면 조회마다 반복.
- 원인: 웹 도넛 차트의 `Circle`에 `onPress`를 주면 `react-native-svg` WebShape가 터치 responder 핸들러(`onResponderTerminate` 등)를 DOM `<circle>`에 그대로 전달 → react-dom 경고.
- 해결: 웹 분기에서 `onPress` 대신 DOM `onClick`(+`cursor:pointer`) 사용. 단, `prepare.js`가 `onPress !== null`일 때 `onClick`을 `props.onPress`로 덮어쓰므로 `onPress: null`을 함께 넘겨 클릭 핸들러 보존(= 도넛 영역 클릭→상세 표시 기능 유지, TO-BE 18 회귀 방지).

**15. 날씨 상세 모달 시간별 예보 좌우 스크롤 (`WeatherModal.tsx`)**
- 웹에서 시간별 예보를 고정 flex-row(`hourlyRowWeb`)로 욱여넣어 우측이 잘리던 문제 → 네이티브와 동일하게 가로 `ScrollView`로 통일(웹은 스크롤바 표시). 좌우 스크롤로 전체 시간대 조회 가능.

---

## 2026-06-18 — 19차 작업 (거래처 관리)

### TO-BE 로드맵 11 적용 — 거래처(판매처) 관리 + 판매 입력 연동

**DB / 데이터**
- 마이그레이션 `014_clients`: `clients` 테이블(user별, name·channel('online'|'offline')·commission_type('%'|'원')·commission_value). RLS는 `auth.uid() = user_id`.
- `lib/clients.ts`: 거래처 CRUD + `listClientsByChannel`(판매 구매자 선택지용).

**거래처 관리 페이지 (`ClientsPage`)**
- 농장 설정과 동일한 카드 CRUD 패턴. 필드: 이름 / 구분(온라인·오프라인 칩) / 수수료(비율%·금액원 칩 + 값). 저장·삭제는 전역 토스트.
- `more.tsx` 더보기 메뉴에 "거래처 관리"(handshake) 추가. 기존 "연락처 관리"는 지인 연락처로 설명 분리.

**판매 입력 연동 (`InputFormModal`)**
- 판매 유형이 온라인/오프라인이면 구매자 영역이 **해당 채널 거래처 select**(`SelectModal`, 직접 입력 허용)로 전환. 거래처 선택 시 그 거래처의 수수료(type/value)를 자동으로 채움.
- 과거 기록 유지: 판매 기록(`sales_records`)은 입력 당시 commission·buyer를 그대로 저장하므로 거래처를 나중에 수정해도 과거 기록/통계 불변(추가 작업 없음).

> ⚠️ 배포 시 Supabase에 `supabase/migrations/supabase_migration_014_clients.sql` 적용 필요.

---

## 2026-06-18 — 18차 작업 (입력 폼 내역 단계 개편)

### TO-BE 로드맵 10 적용 — 품종·사이즈 선택 UI → "+ 내역 추가" 통합 모달

`InputFormModal`의 내역 입력 단계(`EntriesContent`)를 재설계.

- 기존: `품종 칩 선택` → `사이즈 칩 탭` → `SizeEntryModal`(수량/단가)로 단계가 분리.
- 변경: 품종·사이즈 칩 선택 UI 삭제 → **"+ 내역 추가" 박스 버튼**(점선, 빈 상태에도 항상 표시) 도입.
  - 버튼 → 신규 **`EntryDetailModal`**(기존 `SizeEntryModal` 대체)에서 **품종·사이즈·수량·단가를 한 번에** 입력. 품종/사이즈는 칩 선택 + 직접 입력 모두 지원, 사이즈 기준(info)은 ⓘ 토글.
  - 저장 시 모달이 닫히고 `sortEntries`(품종→사이즈순)로 정렬되어 **+ 버튼 하위**에 표시.
- 내역 단계 렌더 순서: `+ 내역 추가` → (판매탭) 수확데이터 가져오기 → 입력된 내역 리스트.
- 단일 레코드 수정 폼은 기존 유지. 관련 상태(newVariety/showVarietyInput/sizeModal\*)를 `entryModalVisible` 하나로 정리.

---

## 2026-06-18 — 17차 작업 (관리자 데이터 관리 개편)

### TO-BE 로드맵 9 적용 — MAIN_CODE를 탭 → select로

`AdminDataPage`를 `common_code` 구조 기준으로 전면 재작성.

- 기존: 상단 5개 탭(작물/품종/사이즈/단위/비용) + 탭별 서브컴포넌트 5개.
- 변경: **단일 화면 1개**로 통합. 추가 input 위에 "관리 항목" **select**(7차에서 만든 바텀시트 `SelectModal` 재사용)로 MAIN_CODE 전체를 노출해 선택.
- `MAIN_META`로 항목별 메타(라벨·추가 타이틀·placeholder·부모코드 필요 여부·범위입력 여부·설명)를 일원화 → 분기 코드 제거.
- 품종·사이즈(부모=작물, `hpos_main_code`/`hpos_desc_code` 보유)는 부모 작물 선택도 **관리 항목과 동일한 select(바텀시트)** 형식으로 표시. 작물이 없으면 "먼저 작물을 추가하세요" 안내. (초안의 가로 칩 selector → select로 통일)
- 저장/삭제는 16차 전역 토스트(success/error) 사용. 작물 추가·삭제 시 부모 목록을 재로딩해 품종·사이즈 selector와 동기화.

---

## 2026-06-18 — 16차 작업 (바텀시트 + 전역 Toast)

### TO-BE 로드맵 7·8 적용 — 추가 패키지 없이 RN 내장 API만 사용

**8. 전역 Toast (`components/ui/Toast.tsx`)**
- `ToastProvider`(루트 레이아웃에 배치) + `useToast()` → `toast.success/error/info`. 타입별 아이콘·색(success=check 녹색, error/info=info 빨강/연보라), 하단 슬라이드업 + 자동 닫힘(2.2s).
- 기존 로컬 `useToast`(메시지/표시 상태를 화면마다 관리하던 방식)를 전역으로 통합. `todo.tsx`·`AdminDataPage.tsx`의 모든 토스트 호출을 새 API로 마이그레이션하고 각 화면의 `<Toast/>` 인스턴스 제거.
- 입력 화면 저장(`onSaved`)·삭제(`confirmDelete`)도 토스트로 연결(`error`가 supabase 응답 변수와 겹치지 않도록 `toast` 객체 형태로 노출).

**7. 바텀시트 (`components/ui/BottomSheet.tsx`)**
- RN `Modal` + `Animated`(spring slide-up + 백드롭 페이드) + `PanResponder`(핸들 바를 아래로 끌면 닫힘, 딤 탭으로도 닫힘). web/native 공용, safe-area 하단 패딩 반영.
- `SelectModal`·`TimePickerModal`을 바텀시트로 전환(기존엔 `animationType="slide"`만 흉내 → 드래그 닫기·spring·백드롭 추가).
- 입력 폼(키보드 가림)·날씨(콘텐츠량)·캘린더(중앙 다이얼로그가 자연스러움)는 현행 유지 — 후속 검토 대상.

---

## 2026-06-18 — 15차 작업 (차트 인터랙션)

### TO-BE 로드맵 6 적용 — 도넛·막대 탭 인터랙션

통계 화면 차트를 탭하면 해당 항목을 선택/하이라이트하도록 추가. 선택 상태는 `selectedDonut` / `selectedBar`로 관리하고, 탭/데이터 변경 시 자동 해제. 탭마다 light 햅틱.

**도넛 (구성 비율)**
- 조각(native PieChart `onPress` / web `Svg Circle onPress`) 또는 아래 항목표 행을 탭하면 선택. 같은 항목을 다시 탭하면 해제.
- 선택 시 도넛 중앙 라벨이 전체 총합 대신 **선택 항목명 / 수량 / 비율(%)** 로 바뀜.
- 선택 조각 강조: native는 `focused`로 튀어나오게(`extraRadius={12}`로 캔버스를 키워 조각이 잘리지 않도록), web은 비선택 조각을 `opacity 0.3`으로 흐리게. 항목표 행도 배경 하이라이트.

**막대 (수확량·매출 추이)**
- 가로 막대 행을 탭하면 선택(값이 0인 막대는 비활성). 같은 막대 재탭 시 해제.
- 선택 막대는 색 강조(`primaryDark`) + 라벨/값 굵게, 차트 하단에 **상세 툴팁**(라벨 · 값 · 전체 대비 비율) 표시.

---

## 2026-06-18 — 14차 작업 (Haptic 피드백 + press scale)

### TO-BE 로드맵 4·5 적용

**4. Haptic 피드백 (`expo-haptics`)**
- 신규 `lib/haptics.ts` — `hapticLight` / `hapticMedium` / `hapticSelection` / `hapticSuccess` / `hapticError` 래퍼. web에서는 진동 API가 없어 no-op, 에러도 전부 무시하여 UI 흐름을 막지 않음.
- 하단 탭 전환: `(tabs)/_layout.tsx`의 `screenListeners.tabPress`에 light 햅틱.
- 공용 `Button`: primary는 medium, outline/ghost는 light 햅틱.
- 입력 화면: 세그먼트 탭 전환(selection) / FAB(light) / 저장(success) / 삭제(error).

**5. press scale (`scale: 0.97`)**
- 신규 `components/ui/PressableScale.tsx` — 누르면 spring으로 살짝 줄어드는 `TouchableOpacity` 드롭인. 햅틱(`light`/`medium`/`none`)을 prop으로 통합.
- 홈 화면 요약 카드 4종 + 빠른 메뉴(web/native) 터치를 `PressableScale`로 교체.
- `Button`도 `PressableScale` 기반으로 리팩터 → 전 화면 버튼에 press scale + 햅틱 자동 적용.

### 후속 수정 (레이아웃 회귀 + 관리자 모바일 차단 복원)

**홈 요약 카드 사이징 깨짐 수정**
- 원인: `PressableScale`이 `style`(특히 `flex: 1`)을 바깥 `Pressable`이 아니라 안쪽 `Animated.View`에만 적용 → row 안에서 카드가 균등하게 늘어나지 않음.
- `Animated.createAnimatedComponent(Pressable)`로 바꿔 `style`(레이아웃 + transform)을 `Pressable` 본체에 직접 적용 → `TouchableOpacity`와 동일 동작 복원.

**빠른 메뉴 버튼 크기 통일**
- 기존 web=flex 5등분 / native=가로 스크롤 + 고정 `width:80` 분기를 제거하고, **web/native 모두 `flex: 1` 5등분**으로 통일(라벨 `numberOfLines={1}`).

**관리자 데이터 관리 PC 전용 복원** (`(tabs)/more.tsx`)
- `isAdmin = userRole === 'admin'` → `userRole === 'admin' && !isMobile`로 되돌림.
- 모바일에서는 관리자 메뉴 카드 자체를 숨겨 진입 차단. 배지 문구 `관리자 메뉴 · PC 전용`으로 복원. (PC 브라우저는 `Platform.OS === 'web'`이라 그대로 표시됨)

### 기타
- 프로젝트 응답 언어를 한국어로 고정 (`AGENTS.md`에 규칙 추가).

---

## 2026-06-17 — 13차 작업 (통계 UI 개선 + 코드 테이블 common_code 통합)

### A. 통계 UI 개선 (TO-BE 로드맵 1·2·3)

추가 패키지 없이 RN/Expo 내장 API(`Animated`, `RefreshControl`)만 사용.

**1. 숫자 카운트업 애니메이션**
- `SummaryCard`(수확량·판매량·매출·순수익)의 값이 0 → 실제 값까지 800ms 동안 또르륵 증가.
- `useCountUp` 훅: 표시 문자열(`"1,234"`, `"12.5"`)을 숫자로 파싱 → 원래 포맷(천 단위 구분/소수 자릿수) 유지하며 애니메이션. 값이 바뀌면 현재 값에서 새 목표로 부드럽게 재시작.

**2. 스켈레톤 로더 (shimmer)**
- 신규 `components/ui/Skeleton.tsx` — opacity pulse 기반 회색 자리표시 블록 + `SummaryCardSkeleton`(2×2 그리드) / `BarChartSkeleton`.
- 통계 화면의 요약 카드·막대 차트 로딩을 기존 `ActivityIndicator`(스피너)에서 실제 레이아웃 모양의 스켈레톤으로 교체.

**3. Pull-to-refresh**
- 통계·입력 화면 `ScrollView`에 `RefreshControl`(primary 색) 추가.
- 입력 화면은 새로고침 중 전체 스피너로 전환되지 않도록 `loading && !refreshing` 가드 → 당기는 동안 리스트 유지.

### B. 분리된 코드 테이블 → `common_code` 단일 테이블 통합

기존 5개 테이블(`crop_types` / `varieties_master` / `sizes_master` / `harvest_units` / `expense_types`)을 하나의 `common_code`로 합침.

**설계**
- `main_code`: 분류(`crop` | `vari` | `size` | `unit` | `exps`)
- `desc_code`: 분류 내 코드. `(main_code, desc_code)` 자연키(UNIQUE), 0-패딩 3자리(`001`..)
- `hpos_main_code` / `hpos_desc_code`: 부모 코드. 품종·사이즈는 부모가 작물 → `hpos_main_code='crop'`, `hpos_desc_code=작물 desc_code`
- `info`: 사이즈의 `range_info` 보관
- 레코드(`harvest_records` 등)·`farms`는 작물·품종·사이즈·단위를 **이름(text)** 으로 저장(FK 아님) → 저장 구조는 그대로, `common_code`는 드롭다운 옵션 출처로만 사용.

**초안 SQL 버그 3건 교정**
- `'00'+sort_order` → Postgres `+`는 숫자 연산이라 `text + int` 에러. `lpad(... ::text, 3, '0')`로 교체.
- 모든 작물이 `desc_code='001'`로 충돌 → `row_number()` 기반 고유 코드 부여.
- 사이즈·품종 부모 링크 `hpos_desc_code='1'` 하드코딩(매칭 불가·소속 작물 유실) → 작물 이름으로 조인해 실제 부모 `desc_code` 연결.

**DB 변경 (Supabase migration)**
- `012_common_code.sql`: `common_code` 생성(UNIQUE·부모 인덱스·RLS) + 기존 5개 테이블에서 올바른 코드/부모 링크로 재적재(idempotent, `TRUNCATE` 후 `row_number()`+`lpad`).
- `013_drop_legacy_code_tables.sql`: 통합·검증 후 레거시 5개 테이블 `DROP`. **반드시 012 실행·검증 후** 적용(드롭 후 012 단독 재실행 불가).

**코드 변경**
- 신규 `lib/commonCode.ts`: 데이터 액세스 헬퍼(`listCodes`, `listChildren`, `listVarietiesByCropName`, `listSizesByCropName`, `getCropCode`, `addCode`(desc_code 자동 부여), `deleteCode`).
- `AdminDataPage.tsx`: 작물·품종·사이즈·단위·비용 5개 탭 전부 헬퍼 경유. 품종·사이즈 탭은 작물 선택을 이름 대신 `desc_code` 기준 추적. `supabase` 직접 호출 제거.
- `InputFormModal.tsx`:
  - 단위·품종·사이즈 옵션 로딩을 헬퍼로 교체.
  - **작물 입력을 자유 텍스트 → 공통코드 작물 선택 칩 UI로 변경**(신규/단일 수정 두 곳). 선택한 작물의 하위 품종·사이즈를 `desc_code`로 조회. 공통코드에 없는 작물은 자동 "직접 입력" 모드.
  - 입력 중 포커스 유실 방지를 위해 `CropField`를 (JSX 엘리먼트가 아닌) 호출 함수로 구현(`EntriesContent()` 패턴 준수).

---

## 2026-06-16 — 12차 작업 (아이콘 전면 교체 + web 차트 호환성)

### 아이콘 전면 교체
- `@expo/vector-icons` → `phosphor-react-native` 기반으로 전 화면 아이콘 교체.
- 신규 `components/ui/PhIcon.tsx` 래퍼 — 이름 매핑 + weight(duotone 등) 일원화.
- 블루베리 심볼은 Cherries(duotone) 아이콘으로 표현.

### web 차트 호환성 + 통계 웹 에러 수정
- `react-native-gifted-charts`가 web에서 깨지는 문제 → 도넛/라인 차트를 `Platform.OS === 'web'`일 때 `react-native-svg`로 직접 렌더(`Svg`/`Circle`/`Path`/`Line`)하도록 분기.
- 도넛 회전 애니메이션도 web에서는 정적 `-90°` 회전 + `Animated` 조합으로 처리(`origin` prop의 web DOM 에러 회피).

### 기타
- 기타(나눔/폐기) 항목의 "받는 분" 표시 추가.
- `TO-BE.md` UI 개선 로드맵 문서 추가.

---

## 2026-06-11 — 11차 작업 (메모 저장 버그 수정 + harvest_notes / other_notes 테이블 분리)

### 버그 수정 — 수확·기타 메모 미저장

**원인 1 — 그룹 수정 시 UPDATE 쿼리에 note 누락**

`InputFormModal` 그룹 수정 모드에서 기존 레코드를 UPDATE할 때 `note` 필드가 빠져 있어 저장이 안 되던 문제.

**원인 2 — 그룹 수정 pre-fill 시 note 미복원**

수정 창을 열면 `groupEditRecords`의 첫 번째 레코드에서 날짜·농장·작물 등은 복원했지만 `note`는 `setNote()` 호출이 없어 항상 빈 상태로 표시.

**원인 3 — upsert 시 기존 레코드 발견 시 note 미업데이트**

`upsertHarvest`에서 동일 조합 레코드 발견 시 `quantity`만 누적하고 `note`는 무시.

### 리팩토링 — 메모를 별도 테이블로 분리

note는 의미상 "날짜 + 농장 + 작물" 그룹 단위 개념인데 harvest_records 각 row에 중복 저장되는 구조적 문제를 해결.

**DB 변경 (Supabase migration)**

```sql
create table harvest_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date date not null,
  farm_id uuid references farms(id) on delete cascade,
  crop_type text,
  note text not null,
  created_at timestamptz default now()
);
-- RLS 동일하게 other_notes도 생성
```

**코드 변경**

- `InputFormModal.tsx`: `saveNote()` 헬퍼 추가 — 저장 시 기존 note 삭제 후 재삽입 (NULL unique 문제 없는 delete+insert 패턴)
- 수확·기타 모든 저장 경로(신규 / 그룹 수정 / 단일 수정)에서 `harvest_records` / `other_records` note 컬럼 사용 중단, `saveNote()` 호출로 교체
- `input.tsx` `loadRecords`: `harvest_notes` / `other_notes` 병렬 조회 추가, `getNote()` 헬퍼로 그룹 키 매칭 → `DisplayRecord.note` 매핑

---

## 2026-06-09 — 10차 작업 (입력 UI 개선 — 삭제 기능, 그룹 카드, 품종 칩 입력)

### 통계 탭 요약 카드 + 구성 비율 개선

- `statistics.tsx` 요약 카드에 `SummaryCard` 컴포넌트 적용, 수확/판매/매출/순수익 2×2 레이아웃
- 구성 비율(도넛) 레이아웃 변경: 가로(파이 좌+범례 우) → 세로(파이 위+테이블 아래)
- 파이 차트 반지름 확대(radius 100), 하단 품종·사이즈 / 수량 / 비율 테이블 표시

### 캘린더 선택 날짜 원형 fix

- `CalendarModal.tsx`: `aspectRatio: 1` 퍼센트 너비 셀에 `borderRadius: 999`를 직접 적용하면 타원형이 되는 문제
- 34×34 고정 크기 `dayCircle` View로 래핑 → 완벽한 원형 표시

### 할 일 탭 날짜 → CalendarModal 연동

- `todo.tsx`: 날짜 라벨 탭 → `setDate(today)` 대신 `CalendarModal` 오픈

### 데이터 입력 그룹 카드 개선

- 수확/기타 카드: 품종별 소계(사이즈 2개 이상 시) + 전체 합계(항목 2개 이상 시) 표시
- 판매 카드: 동일 개선 적용
- 삭제 버튼(🗑) 추가 — 그룹 단위 삭제
- 수정/삭제 버튼을 뱃지 라인(groupHeader) 오른쪽으로 이동
- 홈 "수확 입력 / 판매 입력" 버튼 → `useLocalSearchParams`로 해당 탭 자동 전환

### 삭제 버튼 터치 이슈 해결

- `Alert.alert` 미동작(Expo Android 환경) → RN `Modal` 기반 커스텀 확인 다이얼로그로 교체
- 중첩 `TouchableOpacity` 이슈: 외부 래퍼를 `Card`(plain View)로 교체, 수정/삭제 각각 독립 `TouchableOpacity`
- `groupCard` 스타일: `overflow: 'hidden'` 제거 + `elevation: 0` (Android elevation + overflow 터치 차단 버그 회피)

### InputFormModal 개선

- 내역(항목 목록) 품종별 그룹 + 소계 + 합계 표시 (`EntriesContent` 재구성)
- 내역 입력 필드 배경색: `Colors.surface`(흰색) → `rgba(255,255,255,0.6)` + 라벤더 테두리 (`Colors.primaryLight`)
- 품종 입력: TextInput 항상 표시 → 칩 선택 + "직접 입력" 칩 방식으로 변경 (사이즈와 동일 UX)
  - 칩 선택 시 TextInput 숨김, "직접 입력" 탭 시 TextInput 표시
  - 기존 레코드 편집 시 품종이 칩 목록에 없으면 자동으로 직접 입력 상태

---

## 2026-06-07 — 9차 작업 (UI 개선 — 차트 애니메이션, 캘린더 기간별 모드)

### 도넛 차트 회전 애니메이션

- `statistics.tsx`에 `Animated.Value` + `Easing.out(Easing.cubic)` 2초 회전 애니메이션 적용
- `donutTab` 전환 또는 데이터 로드 시 자동 트리거
- 회전 중 중앙 레이블(`kg` 텍스트) 숨김 → 완료 후 표시
- BarChart: `isAnimated animationDuration={500}` 추가

### 도넛 레전드 2줄 레이아웃 + 스크롤

- 기존 1줄(dot + 이름 + kg + %) → 2줄 레이아웃:
  - 1줄: 품종·사이즈명 (굵게)
  - 2줄: kg값 + % (서브 텍스트)
- `ScrollView maxHeight: 88`로 2행 표시 후 스크롤 처리

### 판매 내역 수량/단가 input 겹침 수정

- `InputFormModal` 판매 항목 인라인 편집: row → column 레이아웃으로 변경
- 수량/단가가 세로로 쌓여 겹침 없이 표시

### CalendarModal 기간별 피커 모드

- `mode` prop 추가: `'day' | 'week' | 'month' | 'year'`
- **year**: 연도 그리드 (3열 × 4행, 12년 범위, 페이지 이동)
- **month**: 월 그리드 (4열 × 3행, 연도 네비게이션)
- **week**: 기존 달력 + 선택 주 전체 하이라이트
- **day**: 기존 달력 (변경 없음)
- 하단 Footer: "오늘" (primary) + "닫기" (secondary) 버튼으로 통일

### 통계 기간별 캘린더 연동

- 일별 → `mode='day'`, 주별 → `mode='week'`, 월별 → `mode='month'`, 연별 → `mode='year'`

### 데이터 입력 날짜 캘린더

- `input.tsx` 날짜 텍스트 탭 → `CalendarModal` 오픈 (기존: 오늘로 이동)

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
