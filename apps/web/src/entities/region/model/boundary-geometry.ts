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

/** 임의 기울기 두 끝점 선분 (MSG-357: 5179 격자선은 위경도 평면에서 기울어져 있다) — 뷰포트 컬링(grid-overlay) 입력 */
export type BoundarySegment = [LatLng, LatLng];

// clipLineToBoundary(격자선 경계 절단)는 MSG-477 ③ 전국 확장으로 소비처가 사라져 삭제됐다.
