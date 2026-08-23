/**
 * OS 런타임 권한 3상태 (MSG-447) — 위치·알림 두 축의 공용 정본.
 *
 * MSG-429가 `PushPermissionStatus`로 같은 3상태와 같은 매핑을 이미 갖고 있었는데, 이 티켓에서
 * 위치 축이 **똑같은** `{granted, canAskAgain}` 쌍을 판정하게 되면서 두 벌이 될 뻔했다(결정 D2).
 * `features/`가 아니라 `shared/`인 이유는 `shared/geolocation.ts`가 이 타입을 쓰기 때문이다 —
 * shared는 features를 import할 수 없다(FSD).
 *
 * 플랫폼 API를 직접 만지지 않는 순수 모듈이다 — 어댑터(`geolocation.ts`·`notifications-adapter.ts`)가
 * 네이티브 응답을 여기로 통과시킨다.
 */
export type PermissionState = "granted" | "denied" | "undetermined";

/**
 * 네이티브 권한 응답 → 3상태.
 *
 * `denied`는 **영구 거부**(안드로이드 "다시 묻지 않음")를 뜻한다 — 이 상태에서 권한을 다시
 * 요청하면 OS가 프롬프트를 띄우지 않고 즉시 거부로 돌아오므로, 사용자에게는 "눌러도 아무 일이
 * 없는 버튼"이 된다. 복구 CTA가 [권한 요청]이 아니라 [설정 열기]로 갈리는 유일한 분기점이라
 * `canAskAgain`이 누락된 응답도 낙관하지 않고 `denied`로 접는다.
 */
export const toPermissionState = (input: {
  granted: boolean;
  canAskAgain: boolean | undefined;
}): PermissionState =>
  input.granted ? "granted" : input.canAskAgain ? "undetermined" : "denied";
