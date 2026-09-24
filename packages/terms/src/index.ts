/**
 * 약관 문서 정본 (MSG-606) — 앱(회원가입 동의·프로필 설정 뷰어)과 웹 공개 페이지(`/terms/:docKey`,
 * 앱스토어 심사용 개인정보 처리방침 URL)가 같은 본문·카탈로그를 읽는다. 플랫폼 무의존 순수 모듈.
 * 문구 확정·개정은 `terms-bodies.ts` 한 곳만 고친다.
 */
export * from "./terms-bodies";
export * from "./terms-documents";
