import type { LatLng } from "../../cell/model/grid";

/**
 * 폴리곤 내부 판정 — 웹 `apps/web/src/entities/region/model/boundary-geometry.ts`에서
 * `pointInPolygon`만 옮긴 복제본 (MSG-427 승인 Q5).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 *
 * 용도는 웹과 다르다: 웹은 부산 행정경계 클리핑에 쓰지만, 모바일은 **BOX 미션 폴리곤**
 * 안에 드는 격자 셀 중심을 고르는 데 쓴다(mission.ts `missionGridIdsInBounds`).
 * 선분 절단(`clipLineToBoundary`)·부산 경계 상수는 사용처가 없어 옮기지 않았다.
 * 동등성은 point-in-polygon.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 */

/** 링 = 닫힌 경계 하나 (첫 점과 끝 점을 잇는 것으로 본다) */
export type BoundaryRing = LatLng[];
/** 폴리곤 = 외곽 링 + 홀 링들 */
export type BoundaryPolygon = BoundaryRing[];
/** MultiPolygon = 서로 떨어진 폴리곤 목록 */
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
 * 점이 MultiPolygon 내부인지 판정한다.
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
