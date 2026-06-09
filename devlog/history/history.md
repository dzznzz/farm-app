# 개발 이력

---

## 2026-06-09 (10차) — 입력 UI 개선 (삭제 기능, 그룹 카드, 품종 칩 입력)

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/statistics.tsx` | SummaryCard 적용(2×2 레이아웃), 구성비율 세로 레이아웃(파이+테이블) |
| `components/modals/CalendarModal.tsx` | 선택 날짜 원형 fix (34×34 고정 dayCircle View) |
| `app/(tabs)/todo.tsx` | 날짜 탭 → CalendarModal 오픈 |
| `app/(tabs)/input.tsx` | 품종 소계/전체 합계, 그룹 삭제(🗑), 수정/삭제 뱃지 라인 이동, useLocalSearchParams 탭 자동 전환, Alert→Modal 교체, elevation:0 |
| `components/modals/InputFormModal.tsx` | 내역 품종 그룹화+소계+합계, 입력 필드 라벤더 스타일, 품종 칩+직접입력 방식 |

---

## 2026-06-07 (9차) — UI 개선 (차트 애니메이션, 캘린더 기간별 모드, 레이아웃 수정)

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/statistics.tsx` | 도넛 2초 회전 애니메이션(Animated+Easing), BarChart isAnimated, 레전드 2줄 레이아웃+스크롤, CalendarModal mode 연동 |
| `app/(tabs)/input.tsx` | 날짜 텍스트 탭 → CalendarModal 오픈 |
| `components/modals/CalendarModal.tsx` | mode prop(day/week/month/year), year·month 그리드 피커, week 하이라이트, 오늘·닫기 Footer |
| `components/modals/InputFormModal.tsx` | 판매 항목 수량·단가 row→column 레이아웃 (겹침 수정) |

---

## 2026-06-07 (8차) — 판매 유형별 구분 저장 버그 수정

| 파일 | 변경 내용 |
|---|---|
| `components/modals/InputFormModal.tsx` | upsertSales 매칭 키에 sale_type 추가 |

---

## 2026-06-07 (7차) — 판매 유형 필수 STEP + 판매 묶음 카드 + 수정폼 pre-fill

**커밋**: `fa5ffdd` feat: 판매 유형 필수 STEP + 판매 묶음 카드 + 수정폼 pre-fill 수정

| 파일 | 변경 내용 |
|---|---|
| `supabase/migrations/supabase_migration_009.sql` | sales_records.sale_type TEXT 컬럼 추가 |
| `components/modals/InputFormModal.tsx` | 판매 유형 STEP 추가, 그룹 수정 pre-fill 완성 |
| `app/(tabs)/input.tsx` | groupSalesRecords 함수(buyer+saleType 묶음), 묶음 카드 렌더링 |
| `components/modals/RecordDetailModal.tsx` | sale_type 표시 추가 |
| `app/(tabs)/index.tsx` | 홈 판매 요약 연동 |

---

## 2026-06-07 (6차) — 통계 미래 날짜 선택 차단

**커밋**: `8b0c528` feat: 통계 미래 날짜 선택 차단

| 파일 | 변경 내용 |
|---|---|
| `components/modals/CalendarModal.tsx` | maxDate prop 추가, 미래 날짜 회색·비활성 처리 |
| `app/(tabs)/statistics.tsx` | `›` 버튼 today 이후 비활성화, CalendarModal에 maxDate 전달 |

---

## 2026-06-07 (5차) — 통계 날짜 네비게이터 + 기간별 날짜 선택 + 품종·사이즈 도넛

**커밋**: `ba2c5f2` feat: 통계 날짜 네비게이터 + 기간별 날짜 선택 + 품종·사이즈 도넛

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/statistics.tsx` | 날짜 네비게이터 최상단 이동, 기간별 ‹›버튼+라벨탭 CalendarModal 연동 |
| `hooks/useStats.ts` | fetchPeriodSummaryForRange 신규, byVarietySize 집계 추가 |

---

## 2026-06-07 (4차) — 통계 차트 개선 + 수정폼 개선

**커밋**: `b7174a4` feat: 통계 차트 개선 + 수정폼 개선

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/statistics.tsx` | 도넛·막대 차트 전체너비 카드 분리, getBarChartRange, breakdownData 독립 fetch |
| `components/modals/InputFormModal.tsx` | 수확/기타 수량 인라인 TextInput, 항목 정렬(품종 asc → sizeOptions) |

---

## 2026-06-07 (3차) — 입력 날짜 동기화 + 통계 차트 도넛/막대 분할

**커밋**: `5372fc4` feat: 입력 날짜 동기화 + 통계 차트 도넛/막대 분할

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/statistics.tsx` | PieChart 도입, 도넛·막대 좌우 분할, fillFullRange, topLabelComponent |
| `components/modals/InputFormModal.tsx` | visible 변경 시 initialDate 동기화 |

---

## 2026-06-07 (2차) — 수확데이터 인라인 편집 + upsert + 그룹 수정

**커밋**: `b923326`, `665c121`

| 파일 | 변경 내용 |
|---|---|
| `components/modals/InputFormModal.tsx` | updateEntry 헬퍼, 수량·단가 TextInput 인라인, upsertHarvest/upsertSales/upsertOther 분리, initialDate prop, 그룹 pre-fill |
| `app/(tabs)/input.tsx` | openGroupEdit, 그룹 수정 폼 연동 |

---

## 2026-06-07 (1차) — 데이터 입력 UI 전면 개선

**커밋**: `0699fb1` feat: 데이터 입력 UI 전면 개선

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/input.tsx` | 농장/작물별 그룹 카드, 수량 합산, 바텀시트 개별 선택, groupByFarmCrop 함수 |
| `components/modals/InputFormModal.tsx` | SizeEntryModal, 사이즈별 단가 입력, 수확데이터 가져오기 import |

---

## 2026-06-02 (4차) — 버그 수정 (Google Sheets, 연락처, 기타)

**커밋**: `d3fb1c7`, `4aa18ea`, `1089861`, `f566b67`

| 파일 | 변경 내용 |
|---|---|
| `components/modals/ExportModal.tsx` | redirectUri → request!.redirectUri (Bad Request 수정) |
| `components/pages/ContactsPage.tsx` | presentPicker fields 명시, Fields named export 수정, 앱 이름 변경 |
| `supabase/migrations/supabase_migration_008.sql` | other_records.extra_cost 컬럼 추가 |
| `components/modals/RecordDetailModal.tsx` | 기타 타입 부수비용 표시, 수확 삭제 시 labor_records 함께 삭제 |
| `components/pages/FarmSettingsPage.tsx` | 주소 AddressField 인라인 전환(focus 유지) |
| `hooks/useStats.ts` / `components/modals/BreakdownModal.tsx` | fetchBreakdown farmId 파라미터 추가 |
| `app.json` | 앱 이름 변경 |

---

## 2026-06-02 (3차) — UI 버그 수정 4건

**커밋**: `614d1af` fix: 4가지 UI 버그 수정

| 파일 | 변경 내용 |
|---|---|
| `components/pages/AdminDataPage.tsx` | ScrollView→View 교체, tabsRow 스타일로 탭 깨짐 수정 |
| `app/(tabs)/input.tsx` | 농장 뱃지 렌더 시점 실시간 조회로 타이밍 버그 수정 |
| `app/(tabs)/statistics.tsx` | 단가 히스토리 최근 30일 고정, 카드 전체 너비 꽉 채우기 |

---

## 2026-06-02 (2차) — 7가지 기능 개선

**커밋**: `49135bb` feat: 7가지 기능 개선 — farm_id 복원, 농장 필터 통계, 단가추이, 작년동월비교, 인건비 반영

| 파일 | 변경 내용 |
|---|---|
| `components/modals/RecordDetailModal.tsx` | DisplayRecord에 farmId/farmName 추가, 상세 화면에 농장 표시 |
| `app/(tabs)/input.tsx` | 모든 record 쿼리에 farm_id 포함, 목록 카드에 농장 뱃지 표시 |
| `components/modals/InputFormModal.tsx` | 수정 모드에서 editRecord.farmId로 원래 농장 복원 |
| `hooks/useStats.ts` | farmId 파라미터 추가(전체 쿼리 필터), 작년 동월 범위 계산, fetchPriceHistory 신규 |
| `app/(tabs)/statistics.tsx` | 농장 칩 필터 UI, 작년 동월 비교 행, 최근 판매 단가 섹션 추가 |
| `lib/googleSheets.ts` | labor_records 월 합계 조회, 순수익에서 인건비 차감, 인건비 별도 행 표기 |
| `components/modals/ExportModal.tsx` | fetchMonthlyExportData 신규 반환 타입 {rows, laborTotal} 대응 |

**주요 내용**:
1. **수정 모드 farm_id 복원**: 기록 수정 시 원래 농장이 자동 선택됨
2. **Google Sheets 인건비 반영**: `순수익 = 매출 - 수수료 - 부수비용 - 인건비`
3. **통계 농장별 필터**: 농장 2개 이상 시 칩 필터 표시, 선택 농장 기준으로 모든 통계 재계산
4. **작년 동월 비교**: 월별 탭에서 "전월 대비" 아래 "작년 동월 비교" 섹션 추가
5. **단가 히스토리**: 통계 페이지에 "최근 판매 단가" 목록 섹션 추가
6. **재고 뷰**: 기존 잔여 재고 카드가 농장 필터 연동
7. **입력 목록 농장 뱃지**: 수확/판매/기타 카드에 농장명 초록 뱃지 표시

---

## 2026-06-02 (1차) — 주요 기능 개선 및 버그 수정

**커밋**: `a309f3b` feat: 농장 개선, 입력 step 재설계, Sheets 내보내기 개선, 관리자 모바일 지원

| 파일 | 변경 내용 |
|---|---|
| `components/modals/ExportModal.tsx` | @react-native-google-signin 제거, expo-auth-session OAuth2 전환, 계정 캐싱 제거 |
| `lib/googleSheets.ts` | 농장 컬럼 추가, Sheets batchUpdate 디자인 적용 |
| `components/pages/ContactsPage.tsx` | Contact.presentPicker() 네이티브 피커 전환, deprecated API 제거 |
| `app/(tabs)/todo.tsx` | 알람 툴팁 absolute 포지셔닝으로 레이아웃 깨짐 수정 |
| `components/pages/FarmSettingsPage.tsx` | 최대 5개 제한, 대표 농장 지정, 주소 추가(카카오 검색), 버튼 레이아웃 통일 |
| `components/modals/InputFormModal.tsx` | 농장 선택 step 추가, 수정 모드 날짜·농장 분리, farm_id 업데이트 |
| `app/(tabs)/input.tsx` | farms 쿼리에 is_primary 포함 |
| `app/(tabs)/more.tsx` | 관리자 메뉴 모바일 표시 |
| `components/pages/AdminDataPage.tsx` | readOnly prop, 모바일 진입 시 차단 배너 + pointerEvents="none" |
| `.env.example` | GOOGLE_IOS/ANDROID/WEB_CLIENT_ID, KAKAO_REST_API_KEY 추가 |
| `supabase/migrations/20260602_farms_add_columns.sql` | farms 테이블 is_primary, address 컬럼 추가 |
| `devlog/history/work-log.md` | 작업 이력 문서화 |

**주요 내용**:
- Google Sheets 내보내기 완전 재구현 (expo-auth-session, 매번 계정 선택)
- 농장별 14컬럼 시트 + 헤더 초록/합계 노란 디자인
- 연락처: 권한 불필요한 iOS 네이티브 피커(`Contact.presentPicker()`)
- 농장 설정: 최대 5개, 대표 지정, 주소(카카오 검색), 버튼 정렬
- 입력 등록 흐름: 날짜 → **농장** → 작물 → 내역 (농장 step 신규 추가)

---

## 2026-06-01 — TODO 알람, 인건비, 통계 개선, 연락처 수정

**커밋**: `2532ef0` feat: 입력 재설계, 통계 개선, TODO 알람, 연락처 수정, 인건비 기능 추가

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/todo.tsx` | 알람 아이콘 + 10분 전 로컬 알림, 툴팁 안내, 수정 기능 |
| `app/(tabs)/statistics.tsx` | 기간별 요약 카드, 추이 차트, 기간 비교, 잔여 재고, Sheets 버튼 |
| `app/(tabs)/input.tsx` | FAB + 날짜 네비게이션 구조로 전면 재설계 |
| `components/modals/InputFormModal.tsx` | 단계별(STEP) 폼, 다중 항목, 작업자 인건비 등록 |
| `components/pages/ContactsPage.tsx` | 기기에서 가져오기 개선, 직접 추가/수정/삭제 |
| `hooks/useStats.ts` | netRevenue, laborCost 집계, fetchPeriodSummary 신규 |

---

## 2026-06-01 — 버그 수정 3차 (통계 크래시, 연락처 limited 권한)

**커밋**: `ec1f758` fix: 통계 화면 크래시, 연락처 limited 권한 처리

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/statistics.tsx` | BreakdownModal / ExportModal lazy mount |
| `components/modals/ExportModal.tsx` | 빈 webClientId 안전 처리 |
| `components/pages/ContactsPage.tsx` | iOS 14+ `limited` 권한을 `granted`와 동일 처리 |

---

## 2026-06-01 — 버그 수정 2차 (런타임 크래시 3종)

**커밋**: `4bc05fe` fix: statistics crash, contacts import, weather modal close button

| 파일 | 변경 내용 |
|---|---|
| `app/(tabs)/statistics.tsx` | BarChart `gradientColor`, `isAnimated` props 제거 |
| `components/modals/WeatherModal.tsx` | SafeAreaView → useSafeAreaInsets 교체 |
| `components/pages/ContactsPage.tsx` | `name` null 처리, firstName+lastName 폴백 |

---

## 2026-06-01 — iOS EAS 빌드 실패 해결

**커밋**: `b3192a2` fix: use Xcode 26.2 image for Swift 6.2 support

| 커밋 | 내용 |
|---|---|
| `050e0f0` | `react-native-maps` 제거 |
| `047dbe0` | Xcode 16.4 시도 (실패) |
| `b3192a2` | `macos-sequoia-15.6-xcode-26.2` 최종 변경 |

---

## 2026-05-31 — TODO 수정, 홈 위젯 재구성, 시간 피커

**커밋**: `408709a`, `a6ab8a2`, `6a827e9`, `f503117`

| 기능 | 내용 |
|---|---|
| TODO 수정 | 각 항목 ✏️ 수정 버튼, 인라인 편집, TimePickerModal |
| 홈 재구성 | 할 일 → 오늘 요약 → 날씨 → 빠른 메뉴 순서 |
| 수수료/부수비용 | 판매 입력에 % / 원 토글, 순수익 실시간 계산 |
| TODO 탭 | 신규 추가, 알람 기능 기반 작업 |
| Google Sheets | OAuth 인증 후 월간 데이터 내보내기 |
| 날씨 상세 | 시간별·주간·월별 예보, 농업 계절 가이드 |

---

## 2026-05-27 — 초기 구현

**커밋**: `c9ccd65` feat: 농장관리 앱 초기 구현 (Expo+Supabase+Gemini)

- Expo SDK 56, TypeScript, React Native 0.85.3
- Supabase 연동 (인증 + DB)
- 기본 탭: 홈, 통계, 입력, 할 일, 더보기
- AI 챗봇 (Gemini → Groq 전환)
- 날씨 API (OpenWeatherMap)
- 연락처 관리
- 관리자 DB 관리 화면 (작물·품종·사이즈·단위·비용 CRUD)
- EAS 빌드 설정 (iOS / Android)
