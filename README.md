# 농장관리 앱

블루베리 농장의 수확·판매·재고를 한 앱에서 관리하는 모바일 앱입니다.
Expo (React Native) + Supabase 기반, iOS / Android / 웹 모두 지원합니다.

---

## 주요 기능

| 탭 | 기능 |
|---|---|
| 🏠 홈 | 오늘 요약 (수확량·매출), 날씨 위젯, 빠른 입력 메뉴, 할 일 미리보기 |
| ✅ 할 일 | 날짜별 할 일 목록, 완료 체크, 시간 설정, 시간순 정렬 |
| 📊 통계 | 일·주·월·연별 차트, 기간 비교, 잔여 재고, 작물·품종·사이즈 상세 분석 |
| ✏️ 입력 | 수확 / 판매 / 기타(나눔·폐기) 기록 |
| ⋯ 더보기 | 연락처, AI 챗봇, 농장 설정, 프로필 |

---

## 탭별 사용법

### 🏠 홈
- 오늘 수확량과 매출을 요약 카드로 확인합니다.
- **날씨 카드**를 탭하면 상세 날씨 및 예보 화면이 열립니다.
- **빠른 메뉴** 버튼으로 수확 입력 / 판매 입력 / 통계 / 연락처 / 챗봇에 바로 접근합니다.

### ✅ 할 일
- 날짜 화살표로 날짜를 이동합니다.
- **+ 추가** 버튼으로 할 일과 시간을 등록합니다.
- 항목 왼쪽 원을 탭하면 완료/미완료 토글됩니다.
- ✏️ 버튼으로 내용·시간을 수정하고, 🗑️ 버튼으로 삭제합니다.
- 완료된 항목은 **완료 항목 삭제** 버튼으로 일괄 삭제합니다.

### 📊 통계
- 상단 탭에서 **일별 / 주별 / 월별 / 연별** 기간을 선택합니다.
- **날짜 네비게이터** (`‹` / `›`)로 기간을 이동하거나 날짜 라벨을 탭해 직접 지정합니다.
- **도넛 차트**: 작물별 / 품종별 / 품종·사이즈별 수량 분포를 확인합니다.
- **막대 차트**: 수확량 또는 매출 추이를 전환해서 봅니다.
- **기간 비교** 카드에서 전 기간 대비 증감률을 확인합니다. 월별 탭은 **작년 동월 비교** 추가.
- **잔여 재고** = 수확량 − 판매량 − 기타(나눔+폐기)
- **작물·품종·사이즈별 상세 분석** 버튼으로 세분화된 수치를 확인합니다.
- **최근 판매 단가** 카드에서 최근 8건 단가 이력을 확인합니다.
- **Google Sheets 내보내기** (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID 설정 필요)

### ✏️ 입력
입력 탭은 3가지 유형으로 나뉩니다.

#### 🫐 수확
| 필드 | 설명 |
|---|---|
| 날짜 | 수확한 날짜 |
| 농장 | 등록된 농장 중 선택 |
| 작물 / 품종 | 직접 입력 또는 DB 목록에서 선택 |
| 사이즈 | 대 / 특 / 왕특 / 왕왕특 또는 직접 입력 |
| 수확량 | 숫자 입력 후 단위(kg·박스 등) 선택 |
| 메모 | 특이사항 기록 |

#### 💰 판매
수확 필드 + 추가 항목:

| 필드 | 설명 |
|---|---|
| 판매 유형 | 온라인 / 오프라인 / 지인판매 / 기타 (필수) |
| 단가 (원) | 항목(사이즈)별 개별 입력 |
| 수수료 | % 비율 또는 금액(원) 선택 입력 |
| 부수비용 | 택배비·포장비 등 합산 |
| 구매자 | 구매처 또는 구매자명 |

- **수확데이터 가져오기**: 당일 수확 데이터를 판매 항목으로 자동 import
- 목록: `buyer + 판매유형` 기준 묶음 카드로 표시, 항목별 소계·합계 표기
- 입력 중 **총 매출 → 수수료 → 부수비용 → 순수익**이 실시간으로 계산됩니다.

#### 📋 기타 (나눔 / 폐기)
- **나눔**: 지인·이웃에게 무상으로 준 수량
- **폐기**: 품질 저하로 판매하지 못한 수량
- 잔여 재고 계산에서 차감됩니다.

### ⋯ 더보기

#### 📱 연락처
- **기기에서 가져오기**: 휴대폰 연락처를 앱으로 불러옵니다.
  - iOS 14 이상에서 "일부 허용" 선택도 정상 동작합니다.
- 이름순 / 직접순서 정렬을 전환할 수 있습니다.
- 📞 전화, 💬 문자, 🟡 카카오톡, ✏️ 수정, 🗑️ 삭제 버튼을 제공합니다.

#### 🤖 AI 챗봇
- 농업 관련 질문에 AI가 답합니다 (Groq LLaMA 3.1 기반).
- 하루 50회 사용 제한 (남은 횟수 헤더에 표시).
- 대화는 계정별로 저장되며 초기화 버튼으로 삭제할 수 있습니다.

---

## 빌드 및 배포

### 개발 서버
```bash
npm install
npm start          # Expo Metro 서버 시작
```

### iOS TestFlight (내부 배포)
```bash
npx eas build --platform ios --profile preview
```

### Android APK
```bash
npx eas build --platform android --profile preview
```

### 환경변수 EAS 등록 (최초 1회)
```bash
npx eas secret:push --scope project --env-file .env
```

> `.env` 파일은 `.gitignore`에 포함되어 Git에 올라가지 않습니다.
> API 키는 반드시 `eas secret:push`로 EAS 서버에 등록해야 빌드에 포함됩니다.

---

## 환경변수 목록

| 변수명 | 설명 | 발급처 |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | supabase.com |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | supabase.com |
| `EXPO_PUBLIC_OPENWEATHER_API_KEY` | 날씨 API | openweathermap.org |
| `EXPO_PUBLIC_GROQ_API_KEY` | AI 챗봇 API | console.groq.com (무료) |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Sheets 내보내기 | console.cloud.google.com (선택) |

---

## 기술 스택

| 항목 | 버전 |
|---|---|
| Expo SDK | 56 |
| React Native | 0.85.3 |
| React | 19.2.3 |
| Supabase JS | 2.x |
| EAS Build (iOS) | macos-sequoia-15.6 / Xcode 26.2 |

---

## 프로젝트 구조

```
app/
  (auth)/           # 로그인·회원가입
  (tabs)/           # 메인 탭 화면
    index.tsx       # 홈
    todo.tsx        # 할 일
    statistics.tsx  # 통계
    input.tsx       # 데이터 입력
    more.tsx        # 더보기

components/
  modals/           # 캘린더, 날씨, 품종 선택 등 모달
  pages/            # 연락처, 챗봇, 농장 설정 등 서브 페이지
  ui/               # Button, Card, Toast 등 공용 컴포넌트

hooks/
  useAuth.ts        # 인증 상태
  useStats.ts       # 통계 데이터 조회·집계

lib/
  supabase.ts       # Supabase 클라이언트
  weather.ts        # OpenWeatherMap API
  gemini.ts         # AI 챗봇 (Groq)
  googleSheets.ts   # Google Sheets 내보내기

constants/
  theme.ts          # 색상·간격·폰트 상수

types/
  index.ts          # 공용 TypeScript 타입 정의
```
