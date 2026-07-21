/**
 * 업로드 위저드 스텝 전이 — 순수 로직 (MSG-119 L1·L2).
 * 플랫폼 API(window·File·DOM 등)를 참조하지 않는다 — 스텝 문자열과 초 단위 숫자만 다루므로 RN 재사용 대상.
 * 블러 확인은 5초 초과/이하와 무관하게 항상 거치는 필수 프라이버시 게이트이고,
 * 하이라이트는 5초 초과 영상에서만 거친다.
 */

import { shouldOfferHighlight } from "./highlight-selection";

/** 업로드 위저드 스텝 — 정보 입력 → (하이라이트) → 블러 확인. */
export type UploadStep = "select" | "highlight" | "blur";

/**
 * 현재 스텝과 영상 길이로 다음 스텝을 판정한다. [L1·L2]
 * - "select": 5초를 초과하면 "highlight"(하이라이트 제공), 5초 이하이면 "blur"(하이라이트 건너뜀).
 *   경계는 shouldOfferHighlight를 재사용해 하이라이트 제공 조건과 정합을 유지한다.
 * - "highlight": duration과 무관하게 항상 "blur"(블러 확인은 필수 게이트).
 */
export const getNextStep = (
  current: UploadStep,
  duration: number,
): UploadStep => {
  if (current === "select") {
    return shouldOfferHighlight(duration) ? "highlight" : "blur";
  }
  return "blur";
};
