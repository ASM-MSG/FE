/**
 * 액세스 토큰에서 현재 사용자 id를 읽는다 (MSG-606). 서버 JWT의 `sub`가 우리 앱 유저 id다
 * (BE `TokenProvider.issueAccessToken(userId, role)`). getMe 응답에는 userId가 없어, "내 영상인가" 같은
 * 소유 판정에 닉네임을 쓰면 동명이인(닉네임 중복 허용, `profile-edit.ts`)에서 틀린다 — codex 리뷰.
 * 서명은 검증하지 않는다(판정 재료일 뿐, 인가는 서버 몫). 형식이 어긋나면 null.
 */
const POSITIVE_INT = /^[1-9]\d*$/;

const decodeBase64Url = (segment: string): string | null => {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    return globalThis.atob(padded);
  } catch {
    return null;
  }
};

export const userIdFromAccessToken = (token: string | null): number | null => {
  if (token === null) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const json = decodeBase64Url(parts[1]);
  if (json === null) return null;
  try {
    const payload: unknown = JSON.parse(json);
    if (typeof payload !== "object" || payload === null) return null;
    const sub = (payload as { sub?: unknown }).sub;
    const text = typeof sub === "number" ? String(sub) : sub;
    if (typeof text !== "string" || !POSITIVE_INT.test(text)) return null;
    const id = Number(text);
    return Number.isSafeInteger(id) ? id : null;
  } catch {
    return null;
  }
};
