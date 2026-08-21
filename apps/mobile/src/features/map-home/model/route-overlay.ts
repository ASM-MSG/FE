import type { LatLng } from "../../../entities/cell/model/grid";

/**
 * 코스 경로 번호 마커 파생 (MSG-427 E14) — 순수 함수.
 * 지도 SDK/플랫폼에 의존하지 않는다.
 *
 * 구 `mock-theme-data.ts`에 있던 `RouteWaypoint`·`buildRouteWaypoints`의 이관처다
 * (목 제거 — F1). 입력이 목 경로에서 코스 미션의 포토스팟 좌표(`CourseSpot.position`)로
 * 바뀌었을 뿐 파생 규칙은 같다: 배열 순서 = 방문 순서 = 마커 번호.
 */
export interface RouteWaypoint {
  /** 1부터 시작하는 방문 순번 — 번호 마커 표기 */
  seq: number;
  coord: LatLng;
}

/** 경로 좌표 배열 → 번호 웨이포인트. [E14] */
export const buildRouteWaypoints = (path: LatLng[]): RouteWaypoint[] =>
  path.map((coord, i) => ({ seq: i + 1, coord }));
