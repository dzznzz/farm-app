# 버그 리포트 — 2026-06-02

> 배포 후 실기기(iOS) 테스트에서 발견된 오류 2건

---

## BUG-001 — Google Sheets 내보내기 Bad Request

### 증상
Google 계정 선택 → 권한 동의 → 앱으로 돌아오면 오류 팝업 표시

```
The provided authorization grant (e.g., authorization code, resource owner
credentials) or refresh token is invalid, expired, revoked, does not match
the redirection URI used in the authorization request, or was issued to
another client.
More info: Bad Request
```

### 캡처
- `KakaoTalk_20260602_171055988.png` — Google 미인증 앱 경고 (정상 진행)
- `KakaoTalk_20260602_171055988_01.png` — 권한 동의 화면 (정상 진행)
- `KakaoTalk_20260602_171055988_02.png` — 앱 내 오류 팝업 (Bad Request)

### 원인 분석

**파일**: `components/modals/ExportModal.tsx` — 70번째 줄

```typescript
// 현재 코드 (잘못됨)
const redirectUri = `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}:/oauthredirect`;

const tokenResponse = await exchangeCodeAsync(
  {
    clientId,
    redirectUri,          // ← 수동으로 조립한 URI
    code: result.params.code,
    extraParams: request?.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
  },
  { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
);
```

Google의 token endpoint(`oauth2.googleapis.com/token`)는 **토큰 교환 시 전달하는 `redirect_uri`가 최초 authorization request에서 사용한 `redirect_uri`와 정확히 일치**해야 한다.

`expo-auth-session`의 `Google.useAuthRequest`는 내부적으로 `makeRedirectUri()`를 통해 redirect URI를 생성하고, 이 값이 `request.redirectUri`에 저장된다. 우리가 수동으로 조립한 URI는 이 값과 미세하게 다를 수 있어 Google이 `redirect_uri_mismatch`로 400 Bad Request를 반환한다.

### 수정 방법

`request.redirectUri`를 직접 사용한다.

```typescript
// 수정 후
const tokenResponse = await exchangeCodeAsync(
  {
    clientId,
    redirectUri: request!.redirectUri,   // ← hook이 실제로 사용한 URI 그대로 전달
    code: result.params.code,
    extraParams: request?.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
  },
  { tokenEndpoint: 'https://oauth2.googleapis.com/token' },
);
```

**수정 위치**: `components/modals/ExportModal.tsx` 68~79번째 줄

변경 범위: 1줄 수정 (수동 URI 조립 코드 → `request!.redirectUri`)

---

## BUG-002 — 연락처 가져오기 "이름이 없는 연락처입니다"

### 증상
기기에서 가져오기 → 연락처 선택 → "이름이 없는 연락처입니다" 알림 → 저장 불가

### 원인 분석

**파일**: `components/pages/ContactsPage.tsx` — 55번째 줄

```typescript
// 현재 코드 (잘못됨)
const contact = await Contact.presentPicker();
```

`Contact.presentPicker()`를 **옵션 없이** 호출하고 있다.

expo-contacts v56에서 `presentPicker()`는 iOS의 `CNContactPickerViewController`를 사용한다. 이 시스템 API는 **어떤 필드를 반환할지 명시하지 않으면 기본적으로 name 계열 필드를 포함하지 않는다.** 결과로 반환되는 `Contact` 객체의 `name`, `firstName`, `lastName`이 모두 `undefined`가 되어 이름이 없는 연락처로 판정된다.

```typescript
const resolvedName =
  contact.name ||                                                    // undefined
  [contact.firstName, contact.lastName].filter(Boolean).join(' ') || // undefined
  '';                                                                // → ''

if (!resolvedName) {
  Alert.alert('안내', '이름이 없는 연락처입니다.');  // ← 항상 여기 도달
  return;
}
```

### 수정 방법

`presentPicker()` 호출 시 `fields` 옵션으로 필요한 필드를 명시한다.

```typescript
// 수정 후
const contact = await Contact.presentPicker({
  fields: [
    Contact.Fields.Name,
    Contact.Fields.FirstName,
    Contact.Fields.LastName,
    Contact.Fields.PhoneNumbers,
  ],
});
```

**수정 위치**: `components/pages/ContactsPage.tsx` 55번째 줄

변경 범위: 1줄 수정 (옵션 객체 추가)

---

## 요약

| # | 버그 | 파일 | 수정 줄 | 난이도 |
|---|------|------|---------|--------|
| BUG-001 | Google Sheets Bad Request | `ExportModal.tsx` | 70 | 1줄 수정 | ✅ 수정 완료 |
| BUG-002 | 연락처 이름 없음 | `ContactsPage.tsx` | 55 | 1줄 수정 | ✅ 수정 완료 |

두 버그 모두 **수정 완료** (2026-06-02).
