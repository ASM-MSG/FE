import type { Bounds } from "@/entities/cell";

/**
 * 뷰포트 → `GET /api/grids` 요청 판정·변환 (MSG-325).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 */

/**
 * bbox 한 변의 최대 span(도) — 명세 제약 "bbox 한 변의 span은 최대 0.5도".
 * 부산 전역(경도 span 0.51도)은 이 상한을 넘어 한 번에 조회할 수 없다.
 */
export const MAX_VIEWPORT_SPAN_DEG = 0.5;

/** `GET /api/grids` 쿼리 파라미터 (명세 이름 그대로) */
export interface GridsRequest {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

/** 뷰포트 Bounds → 명세 파라미터 */
export const toGridsRequest = (bounds: Bounds): GridsRequest => ({
  swLat: bounds.sw.lat,
  swLng: bounds.sw.lng,
  neLat: bounds.ne.lat,
  neLng: bounds.ne.lng,
});

/**
 * 이 뷰포트로 조회해도 되는가 — 지도 준비 전(null)이거나 명세 span 상한 초과면 false.
 * 줌은 판정에 쓰지 않는다 — 저줌 표시는 서버 집계(use-grid-aggregation-query)가 따로
 * 맡고(MSG-410), 이 조회의 bbox 정본은 확정 영역이라(MSG-403) 줌 게이트 없이도
 * 재조회 소용돌이가 없다.
 */
export const canQueryGrids = (bounds: Bounds | null): boolean => {
  if (!bounds) return false;
  return (
    bounds.ne.lat - bounds.sw.lat <= MAX_VIEWPORT_SPAN_DEG &&
    bounds.ne.lng - bounds.sw.lng <= MAX_VIEWPORT_SPAN_DEG
  );
};

/**
 * 뷰포트 bbox를 받는 쿼리들(`/api/grids`·`/api/hotzones`)의 공통 인자 —
 * 요청 파라미터와 실행 여부를 한 번에 만든다. 미요청 상태의 query 값은 enabled가 false라
 * 실제로 나가지 않지만, 훅 옵션 타입이 요구해 0으로 채운다.
 */
export const viewportQueryArgs = (bounds: Bounds | null) => ({
  query: bounds
    ? toGridsRequest(bounds)
    : { swLat: 0, swLng: 0, neLat: 0, neLng: 0 },
  enabled: canQueryGrids(bounds),
});
