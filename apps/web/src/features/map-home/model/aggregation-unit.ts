import type { Bounds } from "@/entities/cell";
import { GRID_MIN_ZOOM } from "./grid-overlay";
import {
  MAP_SCALE_4KM_ZOOM,
  MAP_SCALE_500M_ZOOM,
  MAP_SCALE_8KM_ZOOM,
} from "./map-scale";

/**
 * 줌 → 서버 집계 단위 매핑 (MSG-410 AC 1).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 경계 줌은 전부 축척 표(map-scale) 역산 상수다 — 축척 표가 재보정되면 따라 움직인다
 * (MSG-403 AC 5 관례, 줌 숫자 하드코딩 금지).
 */

/** `GET /api/grids/aggregation`의 집계 단위 — 서버 명세 enum */
export type AggregationUnit = "DONG" | "SIGUNGU" | "SIDO";

/**
 * zoom → 집계 단위. zoom ≥ GRID_MIN_ZOOM(축척 100m~)이면 null — 개별 격자 구간이라
 * 집계를 부르지 않는다. 축척 250m·500m=동, 1km~8km=구, 16km~128km=시 (AC 1).
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
 * unit별 bbox 한 변 span 상한(도) — 서버 명세 제약(초과 시 400/4402).
 * 뷰포트가 이보다 넓으면 clampBoundsToSpan으로 잘라 요청한다 (AC 3).
 */
export const AGGREGATION_SPAN_CAP_DEG: Record<AggregationUnit, number> = {
  DONG: 1.0,
  SIGUNGU: 4.0,
  SIDO: 10.0,
};

/**
 * bounds를 중심 기준으로 한 변 span ≤ cap이 되게 자른다 (AC 3).
 * 상한 이내 축은 건드리지 않는다 — 최소 줌(6)의 극단 뷰포트에서만 가장자리가 잘린다
 * (스펙 리스크 항목 — 수용).
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
 * 마커 클릭 목표 줌 — 클릭 한 번에 다음 세부 단위가 실제로 보이는 줌 (추정 3):
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
