# 환경 설정 가이드 (사용자가 직접 해야 할 일)

## 1단계: Supabase 프로젝트 생성

1. https://supabase.com 접속 → 회원가입/로그인
2. **New project** 클릭
3. 이름: `farm-app`, 비밀번호 설정, 지역: **Northeast Asia (Seoul)** 선택
4. 프로젝트 생성 완료까지 약 2분 대기

### DB 스키마 적용
1. Supabase Dashboard → **SQL Editor** 클릭
2. `supabase_schema.sql` 파일 내용을 전체 복사
3. SQL Editor에 붙여넣기 → **Run** 클릭

### API 키 복사
1. Dashboard → **Settings** → **API**
2. **Project URL** 복사 → `.env` 파일의 `EXPO_PUBLIC_SUPABASE_URL`에 붙여넣기
3. **anon public** 키 복사 → `.env` 파일의 `EXPO_PUBLIC_SUPABASE_ANON_KEY`에 붙여넣기

### 이메일 인증 설정 (선택)
1. Dashboard → **Authentication** → **Settings**
2. **Confirm email** 옵션을 OFF로 설정 (테스트 편의를 위해)

---

## 2단계: OpenWeatherMap API 키

1. https://openweathermap.org/api 접속 → 회원가입
2. 로그인 후 우측 상단 이름 클릭 → **My API Keys**
3. 기본 생성된 키 복사 (또는 새로 생성)
4. `.env` 파일의 `EXPO_PUBLIC_OPENWEATHER_API_KEY`에 붙여넣기

> ⚠️ 키 발급 후 약 10분~2시간 후에 활성화됩니다.

---

## 3단계: Google Gemini API 키

1. https://aistudio.google.com 접속 (Google 계정 로그인)
2. 좌측 **Get API key** 클릭
3. **Create API key** → 키 복사
4. `.env` 파일의 `EXPO_PUBLIC_GEMINI_API_KEY`에 붙여넣기

---

## 4단계: Expo 앱 실행

```bash
# 패키지 설치 (이미 완료)
npm install

# 개발 서버 시작
npm start
```

### 폰에서 테스트
1. 앱스토어/플레이스토어에서 **Expo Go** 앱 설치
2. `npm start` 실행 후 터미널에 QR코드 표시됨
3. Expo Go 앱으로 QR코드 스캔

---

## 5단계: 첫 농장 데이터 추가

앱 실행 후:
1. 회원가입 → 로그인
2. Supabase Dashboard → **Table Editor** → **farms** 테이블
3. **Insert row** 클릭:
   - `user_id`: 로그인 후 Authentication 탭에서 본인 UUID 확인
   - `name`: 예) 1번 밭
   - `crop_type`: 예) 딸기
   - `area_sqm`: 예) 3000

---

## .env 파일 최종 확인

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_OPENWEATHER_API_KEY=abcdef1234567890
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
```

---

## Apple Watch 연동 (추후 진행)

Apple Watch 기능은 Mac + Xcode 환경이 필요합니다.
현재는 iPhone GPS만으로 동선 추적이 동작합니다.
Watch 연동이 필요하시면 별도로 안내해 드립니다.

---

## 무료 서버 한도 요약

| 서비스 | 무료 한도 | 3명 사용 시 |
|--------|----------|------------|
| Supabase | DB 500MB, 50K API/월 | 충분 |
| OpenWeatherMap | 1,000호출/일 | 충분 |
| Gemini API | 1,500호출/일 | 충분 |
| Expo Go | 무제한 | 충분 |
