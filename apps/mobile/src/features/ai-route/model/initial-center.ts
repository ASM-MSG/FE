/**
 * 진입 1회 측위(D1)의 정착 판정 — 순수 상태기계 (MSG-556 codex 재리뷰 P2).
 *
 * `resolveMapCenter()`가 최대 3초 걸리는 동안 지도의 초기 카메라(서면)가 뷰포트를 먼저 채워
 * 제출이 열리면, 폴백 뷰포트로 요청이 나간 뒤 늦은 측위가 지도를 옮겨 결과가 화면 밖을
 * 가리킨다. 웹 MSG-489 D10("새 뷰포트가 반영된 뒤 요청")과 같은 원칙으로 (a) 초기 중심이
 * 정착할 때까지 제출을 막고, (b) 사용자가 먼저 지도를 움직였으면 늦은 측위 이동을 버린다
 * (D12 — 진행 중 지도 잠금 없음). 측위는 총함수(≤3초 + last-known)라 정착은 반드시 온다(D13).
 *
 * 이벤트 `viewport`는 `GridMap.onViewportChange` 호출 — 첫 번째는 씨딩(`onCameraChanged`),
 * 이후는 카메라 idle이다. 화면은 `located` 전이의 결과가 `moving`일 때만 `moveTo`한다.
 */
export type InitialCenterPhase = "seeding" | "locating" | "moving" | "settled";

export type InitialCenterEvent =
  | { type: "viewport" }
  /** 측위 완료 — `moves`는 폴백(서면, 초기 카메라와 동일)이 아니어서 이동이 필요한가 */
  | { type: "located"; moves: boolean };

export const nextInitialCenterPhase = (
  phase: InitialCenterPhase,
  event: InitialCenterEvent,
): InitialCenterPhase => {
  if (phase === "settled") return "settled";
  if (event.type === "located") return event.moves ? "moving" : "settled";
  // viewport — 씨딩이면 측위 대기로, 그 뒤 idle은 이동 완료 또는 사용자 조작이라 정착
  return phase === "seeding" ? "locating" : "settled";
};
