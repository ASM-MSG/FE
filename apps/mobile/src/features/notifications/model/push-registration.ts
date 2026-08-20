/**
 * FCM 푸시 등록 판정 (MSG-429 기준 14·15) — 순수 모델.
 * 웹 MSG-408의 `model/push-sync.ts`·`model/push-toggle.ts` 포팅이며 동등성은
 * `push-registration.parity.test.ts`가 고정한다. 부수효과(권한 요청·토큰 취득·API 호출)는
 * `api/` 층이 맡는다 — 여기에는 `expo-notifications`가 들어오지 않는다(스펙 R6).
 *
 * **웹과의 의도적 편차**: 웹의 `supported`(브라우저 API 존재 판별) 축이 없다. 모바일에서
 * 대응하는 것은 정적 플래그가 아니라 기기 토큰 취득의 실패(Play 서비스 부재 등)라
 * try/catch로 흡수한다.
 */

/** expo-notifications 권한 상태 3종 — `undetermined`는 아직 물어보지 않은 상태다 */
export type PushPermissionStatus = "granted" | "denied" | "undetermined";

/**
 * "알림 받기" 토글의 **푸시 축** 표시 정본 = 권한 granted && 보관 토큰 존재.
 * 권한만 있고 토큰이 없으면 OFF다 — 서버에 등록되지 않은 상태를 켜진 것처럼 보이면
 * "켰는데 알림이 안 온다"가 된다 (웹 MSG-408 결정 1과 같은 판단).
 */
export const derivePushEnabled = (input: {
  permission: PushPermissionStatus;
  hasStoredToken: boolean;
}): boolean => input.permission === "granted" && input.hasStoredToken;

export type PushSyncAction =
  | { type: "none" }
  | { type: "reregister"; token: string }
  | { type: "rotate"; staleToken: string; token: string };

/**
 * 보관 토큰 vs 신규 토큰 → 액션 결정. 같으면 재등록(UPSERT — last_used_at 갱신),
 * 다르면 로테이션(구토큰 해제 후 신규 등록·보관). **보관 토큰 없음은 자동 등록 경로가
 * 아니다** — 등록 진입점은 프로필 토글뿐이다(승인 D2).
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

/** 상주 자동 동기화 발동 조건 — 기존 등록자(보관 토큰 존재) 한정 */
export const shouldAutoSync = (input: {
  isAuthenticated: boolean;
  permission: PushPermissionStatus;
  storedToken: string | null;
}): boolean =>
  input.isAuthenticated &&
  input.permission === "granted" &&
  input.storedToken !== null;

/** 권한 거부 시 토글 행 아래에 띄우는 안내 (기준 15) */
export const PUSH_PERMISSION_DENIED_MESSAGE =
  "기기 설정에서 알림 권한을 허용해야 푸시를 받을 수 있어요";
