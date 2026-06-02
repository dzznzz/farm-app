# 환경 설정 가이드

## 1단계: Supabase 프로젝트 생성

1. https://supabase.com 접속 → 회원가입/로그인
2. **New project** 클릭
3. 이름: `farm-app`, 비밀번호 설정, 지역: **Northeast Asia (Seoul)** 선택
4. 프로젝트 생성 완료까지 약 2분 대기

### DB 스키마 적용
1. Supabase Dashboard → **SQL Editor** 클릭
2. `supabase/supabase_schema.sql` 내용 전체 복사 후 Run
3. 마이그레이션 파일도 순서대로 실행 (`supabase/migrations/*.sql`)

### API 키 복사
1. Dashboard → **Settings** → **API**
2. **Project URL** → `.env`의 `EXPO_PUBLIC_SUPABASE_URL`
3. **anon public** 키 → `.env`의 `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 이메일 인증 설정 (선택)
Dashboard → **Authentication** → **Settings** → **Confirm email** OFF (테스트 편의)

---

## 2단계: OpenWeatherMap API 키

1. https://openweathermap.org/api 접속 → 회원가입
2. 로그인 → 우측 상단 이름 → **My API Keys** → 키 복사
3. `.env`의 `EXPO_PUBLIC_OPENWEATHER_API_KEY`에 붙여넣기

> 키 발급 후 약 10분~2시간 후 활성화됩니다.

---

## 3단계: Groq API 키 (AI 챗봇)

1. https://console.groq.com 접속 → 회원가입 (완전 무료, 신용카드 불필요)
2. **API Keys** → **Create API key** → 키 복사
3. `.env`의 `EXPO_PUBLIC_GROQ_API_KEY`에 붙여넣기

| 항목 | 내용 |
|------|------|
| 모델 | `llama-3.1-8b-instant` |
| 무료 한도 | 하루 14,400회 / 분당 30회 |
| 비용 | 완전 무료 (신용카드 불필요) |

---

## 4단계: Google OAuth 설정 (Sheets 내보내기)

1. https://console.cloud.google.com 접속
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
3. iOS 클라이언트 생성:
   - Application type: **iOS**
   - Bundle ID: `com.dznz.farm`
   - 생성된 Client ID → `.env`의 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
4. Web 클라이언트 생성 (PC 테스트용):
   - Application type: **Web application**
   - 생성된 Client ID → `.env`의 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
5. Google Sheets API 활성화:
   - **APIs & Services** → **Library** → "Google Sheets API" 검색 → **Enable**

---

## 5단계: 카카오 주소 검색 API (선택)

농장 주소 검색 기능을 사용하려면 설정합니다. 없어도 주소를 직접 입력할 수 있습니다.

1. https://developers.kakao.com 접속 → 로그인
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 앱 이름/회사명 입력 후 저장
4. 생성된 앱 → **앱 키** → **REST API 키** 복사
5. `.env`의 `EXPO_PUBLIC_KAKAO_REST_API_KEY`에 붙여넣기

---

## 6단계: Expo 앱 실행

```bash
# 패키지 설치
npm install

# 개발 서버 시작 (Expo Go 앱으로 테스트)
npm start

# 네이티브 dev build로 실행 (권장)
npm run dev
```

### 폰에서 테스트 (Expo Go)
1. 앱스토어에서 **Expo Go** 설치
2. `npm start` 후 터미널 QR코드 스캔

### 네이티브 기능 테스트 (EAS dev build 권장)
연락처 가져오기, 알림 등 네이티브 기능은 Expo Go에서 제한될 수 있습니다.
```bash
eas build --platform ios --profile development
```

---

## 7단계: 첫 농장 등록

앱 실행 후 앱 내에서 직접 등록합니다.
1. 회원가입 → 로그인
2. **더보기** → **농장 설정** → **+ 추가**
3. 농장 이름, 작물, 면적, 주소(선택) 입력
4. 최대 5개까지 등록 가능, 첫 농장은 자동으로 대표 농장 설정

---

## .env 파일 전체 항목

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 날씨
EXPO_PUBLIC_OPENWEATHER_API_KEY=abcdef1234567890

# AI 챗봇 (Groq)
EXPO_PUBLIC_GROQ_API_KEY=gsk_...

# Google Sheets 내보내기
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxx.apps.googleusercontent.com

# 카카오 주소 검색 (선택)
EXPO_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

---

## EAS Build (iOS TestFlight / Android APK)

```bash
npm install -g eas-cli
eas login

# EAS Secret에 환경변수 등록 (빌드 환경에서 .env 사용 불가)
npx eas secret:push --scope project --env-file .env

# iOS 빌드
eas build --platform ios --profile production

# Android APK 빌드
eas build --platform android --profile preview
```

| 플랫폼 | 방법 | 비용 |
|--------|------|------|
| iOS | TestFlight 또는 dev build | EAS 월 1회 무료 |
| Android | APK 직접 설치 | EAS 월 1회 무료 |
| PC | 브라우저 (Vercel/로컬) | 무료 |

---

## 무료 서비스 한도 요약

| 서비스 | 무료 한도 | 비고 |
|--------|----------|------|
| Supabase | DB 500MB, API 50K/월 | 소규모 팀 충분 |
| OpenWeatherMap | 1,000호출/일 | 충분 |
| Groq | 14,400호출/일 | 완전 무료 |
| Google Sheets API | 300req/분 | 내보내기 충분 |
| 카카오 주소 검색 | 300,000회/일 | 충분 |
| EAS Build | 월 1회 무료 | 추가 빌드 유료 |
