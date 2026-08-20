import { describe, expect, it } from "vitest";
import { buildRouteWaypoints } from "./route-overlay";

/**
 * E14: 지도에 코스 경로선과 **번호 경유지 마커**가 표시된다 (MSG-427).
 * 구 `mock-theme-data`에 있던 웨이포인트 파생을 목 제거와 함께 이 파일로 옮겼다 —
 * 이제 입력은 목 경로가 아니라 코스 미션의 포토스팟/라인 좌표다.
 */
const PATH = [
  { lat: 35.1578, lng: 129.0594 },
  { lat: 35.1601, lng: 129.0621 },
  { lat: 35.1631, lng: 129.0652 },
];

describe("코스 번호 경유지 마커 (E14)", () => {
  it("좌표 배열 순서대로 1부터 번호를 매긴다", () => {
    expect(buildRouteWaypoints(PATH)).toEqual([
      { seq: 1, coord: PATH[0] },
      { seq: 2, coord: PATH[1] },
      { seq: 3, coord: PATH[2] },
    ]);
  });

  it("좌표가 없으면 마커도 없다", () => {
    expect(buildRouteWaypoints([])).toEqual([]);
  });
});
