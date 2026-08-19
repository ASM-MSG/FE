import type { Bounds } from "../../../entities/cell/model/grid";
import {
  MAP_SCALE_4KM_ZOOM,
  MAP_SCALE_500M_ZOOM,
  MAP_SCALE_8KM_ZOOM,
} from "./map-scale";
import { GRID_MIN_ZOOM } from "./visible-grid";

/**
 * 줌 → 서버 집계 단위 매핑 — 웹 `features/map-home/model/aggregation-unit.ts`의
 * 복제본이다 (MSG-428, 웹 MSG-410 이식). 동등성은 aggregation-unit.parity.test.ts가
 * 웹 원본을 직접 import해 단정한다.
 * 순수 모듈 — 지도 SDK/RN에 의존하지 않는다(웹 `grid-overlay`가 주던 GRID_MIN_ZOOM만
 * 모바일 `visible-grid`에서 가져온다).
 * 경계 줌은 전부 축척 표(map-scale) 역산 상수다 — 줌 숫자 하드코딩 금지.
 */

/** `GET /api/grids/aggregation`의 집계 단위 — 서버 명세 enum */
export type AggregationUnit = "DONG" | "SIGUNGU" | "SIDO";

/**
 * zoom → 집계 단위. zoom ≥ GRID_MIN_ZOOM(축척 100m~)이면 null — 개별 격자 구간이라
 * 집계를 부르지 않는다. 축척 250m·500m=동, 1km~8km=구, 16km~128km=시.
 */
export const aggregationUnitForZoom = (
  zoom: number,
): AggregationUnit | null => {
  if (zoom >= GRID_MIN_ZOOM) return null;
  if (zoom >= MAP_SCALE_500M_ZOOM) return "DONG";
  if (zoom >= MAP_SCALE_8KM_ZOOM) return "SIGUNGU";
  return "SIDO";
};

/**
 * 지도 줌 하한 (MSG-428 승인 Q3) — **모바일 전용 상수**(웹에는 없다).
 * MVP는 부산 전용이라 시(SIDO) 단위 마커를 만들지 않는데, 단위 테이블에서 SIDO를 빼면
 * 위 네 함수의 시그니처가 웹과 갈라져 parity 전건 비교가 무너진다(승인 Q2). 그래서
 * 테이블은 웹과 동일하게 두고 **카메라가 SIDO 구간(zoom 6~9)에 진입하지 못하게** 막는다 —
 * 배제가 필터가 아니라 도달 불가로 강제된다. 전국 확장 시 이 한 줄만 되돌리면 된다.
 * 하한 = 구 구간(1km~8km)의 가장 넓은 끝 = 축척 8km 단.
 */
export const MAP_MIN_ZOOM = MAP_SCALE_8KM_ZOOM;

/**
 * unit별 bbox 한 변 span 상한(도) — 서버 명세 제약(초과 시 400/4402).
 * 뷰포트가 이보다 넓으면 clampBoundsToSpan으로 잘라 요청한다.
 */
export const AGGREGATION_SPAN_CAP_DEG: Record<AggregationUnit, number> = {
  DONG: 1.0,
  SIGUNGU: 4.0,
  SIDO: 10.0,
};

/**
 * bounds를 중심 기준으로 한 변 span ≤ cap이 되게 자른다.
 * 상한 이내 축은 건드리지 않는다 — 극단 뷰포트에서만 가장자리가 잘린다.
 */
export const clampBoundsToSpan = (bounds: Bounds, capDeg: number): Bounds => {
  const clampAxis = (min: number, max: number): [number, number] => {
    if (max - min <= capDeg) return [min, max];
    const center = (min + max) / 2;
    return [center - capDeg / 2, center + capDeg / 2];
  };
  const [swLat, neLat] = clampAxis(bounds.sw.lat, bounds.ne.lat);
  const [swLng, neLng] = clampAxis(bounds.sw.lng, bounds.ne.lng);
  return {
    sw: { lat: swLat, lng: swLng },
    ne: { lat: neLat, lng: neLng },
  };
};

/**
 * 마커 탭 목표 줌 — 탭 한 번에 다음 세부 단위가 실제로 보이는 줌:
 * 시→4km 단(구 구간), 구→500m 단(동 구간), 동→개별 격자 줌(GRID_MIN_ZOOM).
 */
export const drillInZoomForUnit = (unit: AggregationUnit): number => {
  switch (unit) {
    case "DONG":
      return GRID_MIN_ZOOM;
    case "SIGUNGU":
      return MAP_SCALE_500M_ZOOM;
    case "SIDO":
      return MAP_SCALE_4KM_ZOOM;
  }
};
