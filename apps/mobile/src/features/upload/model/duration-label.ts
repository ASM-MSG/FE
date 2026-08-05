import { formatDuration } from "../../../shared/format";

/** 디자인 예시값 폴백 (Figma 14094:4392 "0:42") — picker가 duration을 못 준 경우만 */
const FALLBACK_LABEL = "0:42";

/**
 * 블러 확인 프리뷰 길이 뱃지 라벨 (MSG-304 AC 4) — 스토어 영상의 실제 durationSec을
 * mm:ss로, 없으면 mock "0:42"로 폴백한다 (승인된 추정: 실 duration + 0:42 폴백).
 */
export const durationLabel = (durationSec: number | null): string =>
  durationSec != null ? formatDuration(durationSec) : FALLBACK_LABEL;
