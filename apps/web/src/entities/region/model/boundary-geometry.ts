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

/** 절단 대상 선분 — 임의 기울기 두 끝점 (MSG-357: 5179 격자선은 위경도 평면에서 기울어져 있다) */
export type BoundarySegment = [LatLng, LatLng];

/**
 * 임의 기울기 선분을 행정경계 내부 구간의 선분(들)로 절단한다. [MSG-263 AC 3 · MSG-357 일반화]
 * 파라메트릭 절단: 선분 P(t) = A + t·(B−A)의 지지 직선과 모든 링(외곽·홀) 변의 교차 t를 모아
 * 정렬하면, even-odd 규칙상 홀수번째→짝수번째 교차 쌍이 내부 구간이다 — 오목 경계·홀·
 * MultiPolygon에서 자연히 다중 선분으로 갈라진다. 각 쌍을 [0,1]로 클램프해 선분 범위로
 * 자른다. 변이 직선을 가로지르는지는 두 끝점의 부호 판정(반개구간 `>` 규칙)으로 정해
 * 꼭짓점 이중 계수를 막는다 — 구 축평행 스캔라인과 같은 규칙의 2D 일반화다.
 * 비용은 선분당 O(경계 정점 수).
 */
export const clipLineToBoundary = (
  [a, b]: BoundarySegment,
  boundary: BoundaryMultiPolygon,
): BoundarySegment[] => {
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  /** 지지 직선 기준 점의 부호 면적 — 0보다 크면 직선 왼쪽 */
  const sideOf = (p: LatLng): number =>
    dLng * (p.lat - a.lat) - dLat * (p.lng - a.lng);

  const crossings: number[] = [];
  for (const polygon of boundary) {
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const c = ring[i];
        const d = ring[j];
        if (sideOf(c) > 0 !== sideOf(d) > 0) {
          // A + t·AB = C + u·CD 를 CD와의 외적으로 소거해 t만 푼다
          const edgeLat = d.lat - c.lat;
          const edgeLng = d.lng - c.lng;
          const denom = dLng * edgeLat - dLat * edgeLng;
          crossings.push(
            ((c.lng - a.lng) * edgeLat - (c.lat - a.lat) * edgeLng) / denom,
          );
        }
      }
    }
  }
  crossings.sort((x, y) => x - y);

  const at = (t: number): LatLng => ({
    lat: a.lat + t * dLat,
    lng: a.lng + t * dLng,
  });

  const segments: BoundarySegment[] = [];
  for (let k = 0; k + 1 < crossings.length; k += 2) {
    const start = Math.max(crossings[k], 0);
    const end = Math.min(crossings[k + 1], 1);
    if (start >= end) continue;
    segments.push([at(start), at(end)]);
  }
  return segments;
};
