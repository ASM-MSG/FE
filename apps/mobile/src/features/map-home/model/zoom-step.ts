/**
 * +/- 버튼 한 단 줌 (MSG-601 iOS 실기 환류) — 순수 함수.
 * 네이버 SDK 내장 줌 컨트롤을 끄고 우리 버튼으로 대체하면서 SDK가 하던 클램프를 여기서 한다.
 * 상한은 네이버 지도 최대 줌(21), 하한은 화면이 넘기는 `minZoom`(홈은 `MAP_MIN_ZOOM`).
 */

/** 네이버 지도 SDK 최대 줌 */
export const MAP_MAX_ZOOM = 21;

export const steppedZoom = (
  current: number,
  delta: 1 | -1,
  minZoom: number,
): number => Math.min(MAP_MAX_ZOOM, Math.max(minZoom, current + delta));
