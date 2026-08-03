import type { LatLng } from "@/entities/cell";

/**
 * 행정경계 폴리곤 판정·절단 (MSG-263 AC 3·4, D7).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 * 경계 데이터(busan-boundary)와 분리된 일반 기하 — 판정은 even-odd(ray casting) 규칙이다.
 */

/** 경계 링 — 마지막 점 = 첫 점 중복 없는 열린 링(암시적 폐합) */
export type BoundaryRing = LatLng[];
/** 폴리곤 = [외곽 링, ...홀 링] */
export type BoundaryPolygon = BoundaryRing[];
/** MultiPolygon = 본토·섬 등 서로 떨어진 폴리곤 목록 */
export type BoundaryMultiPolygon = BoundaryPolygon[];

/** 링 내부 판정 — ray casting (수평 반직선 교차 홀짝, 반개구간 규칙으로 꼭짓점 이중 계수 방지) */
const pointInRing = (point: LatLng, ring: BoundaryRing): boolean => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (
      a.lat > point.lat !== b.lat > point.lat &&
      point.lng <
        ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng
    ) {
      inside = !inside;
    }
  }
  return inside;
};

/**
 * 점이 행정경계(MultiPolygon) 내부인지 판정한다. [AC 4]
 * 외곽 링 안이면서 어느 홀 안도 아닌 폴리곤이 하나라도 있으면 참.
 */
export const pointInPolygon = (
  point: LatLng,
  boundary: BoundaryMultiPolygon,
): boolean =>
  boundary.some(
    ([exterior, ...holes]) =>
      pointInRing(point, exterior) &&
      !holes.some((hole) => pointInRing(point, hole)),
  );

/** 절단 대상 격자선 — 수평(위도 고정) 또는 수직(경도 고정) 선분 */
export type GridLine =
  | { axis: "h"; lat: number; fromLng: number; toLng: number }
  | { axis: "v"; lng: number; fromLat: number; toLat: number };

/**
 * 수평/수직 격자선을 행정경계 내부 구간의 선분(들)로 절단한다. [AC 3]
 * 스캔라인 교차: 모든 링(외곽·홀)의 변과의 교차 좌표를 모아 정렬하면, even-odd 규칙상
 * 홀수번째→짝수번째 교차 쌍이 내부 구간이다 — 오목 경계·홀·MultiPolygon에서 자연히
 * 다중 선분으로 갈라진다. 비용은 선당 O(경계 정점 수).
 */
export const clipLineToBoundary = (
  line: GridLine,
  boundary: BoundaryMultiPolygon,
): [LatLng, LatLng][] => {
  // 스캔 축 좌표(fixed)와 교차 축 좌표를 일반화한다 — h: lat 고정·lng 교차, v: 반대
  const fixed = line.axis === "h" ? line.lat : line.lng;
  const from = line.axis === "h" ? line.fromLng : line.fromLat;
  const to = line.axis === "h" ? line.toLng : line.toLat;

  const crossings: number[] = [];
  for (const polygon of boundary) {
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i];
        const b = ring[j];
        const aFixed = line.axis === "h" ? a.lat : a.lng;
        const bFixed = line.axis === "h" ? b.lat : b.lng;
        if (aFixed > fixed !== bFixed > fixed) {
          const aCross = line.axis === "h" ? a.lng : a.lat;
          const bCross = line.axis === "h" ? b.lng : b.lat;
          crossings.push(
            aCross + ((bCross - aCross) * (fixed - aFixed)) / (bFixed - aFixed),
          );
        }
      }
    }
  }
  crossings.sort((x, y) => x - y);

  const segments: [LatLng, LatLng][] = [];
  for (let k = 0; k + 1 < crossings.length; k += 2) {
    const start = Math.max(crossings[k], from);
    const end = Math.min(crossings[k + 1], to);
    if (start >= end) continue;
    segments.push(
      line.axis === "h"
        ? [
            { lat: line.lat, lng: start },
            { lat: line.lat, lng: end },
          ]
        : [
            { lat: start, lng: line.lng },
            { lat: end, lng: line.lng },
          ],
    );
  }
  return segments;
};
