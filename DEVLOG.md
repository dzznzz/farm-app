# 농장관리 앱 개발 로그

> 작업일: 2026-05-27

---

## 1. 개발 환경 구축

### 완료 내용
- `npm install`로 603개 패키지 설치
- `.env` 파일 생성 (`.env.example` 기반)
- 누락된 웹 의존성 추가 설치

```bash
npx expo install react-native-web @expo/metro-runtime react-dom
```

### 환경 정보
| 항목 | 버전 |
|------|------|
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| Expo CLI | 56.1.12 |
| Expo SDK | 56 |

---

## 2. 버그 수정

### 메인 페이지 — 데이터 없이 % 표시되는 문제

**원인**: `SummaryCard`에 `changeRate={12.5}`, `changeRate={-3.2}`, `changeRate={8.1}` 하드코딩

**수정 내용**:
- `hooks/useStats.ts` — `fetchSummary`가 어제/저번주/저번달 데이터를 함께 조회해 실제 변화율 계산. 이전 기간 데이터가 0이면 `null` 반환
- `components/cards/SummaryCard.tsx` — `changeRate: number | null` 타입으로 변경, `null`이면 배지 미렌더링
- `app/(tabs)/index.tsx` — 하드코딩 값 제거, 실제 `summary.changeRate*` 값 사용

```
데이터 없음 → % 배지 숨김
데이터 있음 → 실제 계산된 % 표시
```

---

## 3. AI 챗봇 — Gemini → Groq 전환

### 경위

| 단계 | 모델 | 오류 |
|------|------|------|
| 1 | `gemini-1.5-flash` | 404 — v1beta에서 모델 없음 |
| 2 | `gemini-2.0-flash` | 429 — 무료 한도 `limit: 0` |
| 3 | `gemini-2.5-flash` | 503 — 트래픽 폭주 |
| 4 | `gemini-2.0-flash-lite` | 429 — 무료 한도 `limit: 0` |

**근본 원인**: 한국에서 Gemini API 무료 티어 미제공 (지역 제한)

### 해결 — Groq API 전환
- 서비스: [console.groq.com](https://console.groq.com) (완전 무료, 신용카드 불필요)
- 모델: `llama-3.1-8b-instant`
- 무료 한도: 하루 14,400회 / 분당 30회

**수정 파일**: `lib/gemini.ts` (인터페이스 유지, 내부 구현만 교체)

```
EXPO_PUBLIC_GROQ_API_KEY 환경변수 추가 필요
```

---

## 4. 챗봇 — 무료 사용량 보호 기능

**목적**: 실수로 유료 요금이 발생하지 않도록 앱 레벨에서 차단

### 구현 내용 (`lib/gemini.ts`)
- AsyncStorage에 날짜별 사용 횟수 저장 (`groq_usage` 키)
- 하루 50회 초과 시 API 호출 없이 즉시 에러 반환
- 자정마다 카운터 자동 초기화

### UI (`app/(tabs)/more.tsx`)
- 챗봇 헤더 오른쪽에 **남은 횟수 표시** (예: `47/50`)
- 대화 있을 때 **초기화 버튼** 노출 → 확인 다이얼로그 후 삭제

---

## 5. 챗봇 — 계정별 대화 기록 유지

**목적**: 앱 종료·탭 이동 후에도 대화 기록 유지, 계정마다 독립적으로 저장

### 구현 내용 (`app/(tabs)/more.tsx`)
- 저장 키: `chat_history_<userId>` (계정별 분리)
- 마운트 시 AsyncStorage에서 이전 대화 로드
- 메시지 전송/수신 시 자동 저장
- 초기화 버튼으로 해당 계정 기록만 삭제

---

## 6. 배포 설정

### Android APK — EAS Build

`eas.json` 신규 생성:

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" }
    }
  }
}
```

빌드 명령:
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

- 빌드 시간: 약 10~15분
- 결과: `.apk` 직접 설치 가능 (월 1회 무료)

### 웹 앱 — Vercel

1. GitHub에 코드 push
2. [vercel.com](https://vercel.com)에서 저장소 연결
3. Environment Variables에 `.env` 값 4개 입력 후 Deploy

| 플랫폼 | 접속 방법 | 비용 |
|--------|-----------|------|
| Android | APK 설치 | 무료 |
| iPhone | 브라우저 (Vercel URL) | 무료 |
| PC | 브라우저 (Vercel URL) | 무료 |

`app.json` 수정: `adaptive-icon` 경로를 실제 파일명(`android-icon-foreground.png`, `android-icon-background.png`)으로 수정

---

## 환경변수 목록

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | supabase.com |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 | supabase.com |
| `EXPO_PUBLIC_OPENWEATHER_API_KEY` | 날씨 API 키 | openweathermap.org |
| `EXPO_PUBLIC_GROQ_API_KEY` | AI 챗봇 API 키 | console.groq.com (무료) |
