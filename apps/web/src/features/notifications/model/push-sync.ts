/**
 * 자동 동기화 판정·전이 (MSG-408 AC 1·2·3) — 순수 함수 (RN 재사용 대상).
 * 부수효과(권한 판독·getToken·API 호출)는 api/use-push-token-sync가 맡는다.
 */

/** 셸 렌더 시 자동 동기화 발동 조건 — 기존 등록자(보관 토큰 존재) 한정 (AC 1·2·3·8) */
export const shouldAutoSync = (input: {
  isAuthenticated: boolean;
  supported: boolean;
  /** null = 판독 불가(미지원 환경) */
  permission: NotificationPermission | null;
  storedToken: string | null;
}): boolean =>
  input.isAuthenticated &&
  input.supported &&
  input.permission === "granted" &&
  input.storedToken !== null;

export type PushSyncAction =
  | { type: "none" }
  | { type: "reregister"; token: string }
  | { type: "rotate"; staleToken: string; token: string };

/**
 * 보관 토큰 vs 신규 토큰 → 액션 결정 (AC 1).
 * 같으면 재등록(UPSERT — last_used_at 갱신), 다르면 로테이션(구토큰 해제 후 신규 등록·보관).
 * 보관 토큰 없음은 자동 등록 경로가 아니다(AC 2) — none.
 */
export const decideSyncAction = (
  storedToken: string | null,
  freshToken: string,
): PushSyncAction => {
  if (storedToken === null) return { type: "none" };
  if (storedToken === freshToken)
    return { type: "reregister", token: freshToken };
  return { type: "rotate", staleToken: storedToken, token: freshToken };
};

/**
 * SW 등록 URL 조립 (AC 12) — firebase-messaging-sw.js는 Vite public/이라 env를 못 읽는다.
 * config 정본(config/firebase.ts)을 쿼리스트링으로 전달한다. 푸시에 필요한 4필드만 싣는다
 * (티켓: apiKey·projectId·messagingSenderId·appId면 충분).
 */
export const buildMessagingSwUrl = (config: {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
}): string =>
  `/firebase-messaging-sw.js?${new URLSearchParams({
    apiKey: config.apiKey,
    projectId: config.projectId,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  }).toString()}`;
