import { describe, expect, it } from "vitest";
import { cellIndexAt } from "../../../entities/cell/model/grid";
import { THEME_IDS } from "./themes";
import {
  MOCK_OCCUPIED_CELLS,
  MOCK_ROUTE_PATH,
  MOCK_THEME_GRIDS,
  SEOMYEON_CENTER_CELL,
  buildRouteWaypoints,
} from "./mock-theme-data";

/**
 * 확정 2: 테마 선택 시 카메라 이동 없음 — mock을 기본 뷰포트(서면 중심 줌 16) 안에
 * 배치한다. 줌 16에서 390×844 화면은 중심 셀 기준 대략 가로 ±3·세로 ±6셀을 덮는다.
 * AC 10: 경로추천 웨이포인트 순번은 mock 좌표 배열 순서와 일치한다.
 */
describe("확정 2 테마 mock 배치 (mock-theme-data)", () => {
  const withinDefaultViewport = ({ col, row }: { col: number; row: number }) => {
    expect(Math.abs(col - SEOMYEON_CENTER_CELL.col)).toBeLessThanOrEqual(3);
    expect(Math.abs(row - SEOMYEON_CENTER_CELL.row)).toBeLessThanOrEqual(6);
  };

  it("테마 격자·내 점령 격자 셀이 전부 기본 뷰포트(서면 중심 줌 16) 안에 있다", () => {
    for (const id of THEME_IDS) {
      for (const grid of MOCK_THEME_GRIDS[id]) withinDefaultViewport(grid.cell);
    }
    for (const cell of MOCK_OCCUPIED_CELLS) withinDefaultViewport(cell);
  });

  it("경로추천 경로 좌표도 전부 기본 뷰포트 안에 있다", () => {
    expect(MOCK_ROUTE_PATH.length).toBeGreaterThanOrEqual(2);
    for (const point of MOCK_ROUTE_PATH) {
      withinDefaultViewport(cellIndexAt(point));
    }
  });

  it("mock 4종 테마 격자 목록은 모두 비어있지 않다 (AC 17 — 빈 상태 화면 확인은 코드 확인으로 갈음하는 전제)", () => {
    for (const id of THEME_IDS) {
      expect(MOCK_THEME_GRIDS[id].length).toBeGreaterThan(0);
    }
  });

  it("각 테마에 내 점령 격자와의 교집합 셀이 1개 이상 있다 (AC 9 빗금 화면 확인 전제)", () => {
    const occupiedKeys = new Set(
      MOCK_OCCUPIED_CELLS.map(({ col, row }) => `${col}:${row}`),
    );
    for (const id of THEME_IDS) {
      const intersection = MOCK_THEME_GRIDS[id].filter(({ cell }) =>
        occupiedKeys.has(`${cell.col}:${cell.row}`),
      );
      expect(intersection.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("타인 영상 mock에는 @핸들 표기용 uploaderHandle이 있다 (AC 14 화면 확인 전제)", () => {
    for (const id of THEME_IDS) {
      for (const { video } of MOCK_THEME_GRIDS[id]) {
        if (!video.isMine) expect(video.uploaderHandle).toBeTruthy();
      }
    }
  });
});

describe("AC 10 경로추천 웨이포인트 순번 파생 (buildRouteWaypoints)", () => {
  it("순번은 좌표 배열 순서 그대로 1부터 부여된다", () => {
    const waypoints = buildRouteWaypoints(MOCK_ROUTE_PATH);
    expect(waypoints).toHaveLength(MOCK_ROUTE_PATH.length);
    waypoints.forEach((waypoint, i) => {
      expect(waypoint.seq).toBe(i + 1);
      expect(waypoint.coord).toEqual(MOCK_ROUTE_PATH[i]);
    });
  });

  it("빈 배열이면 빈 웨이포인트 목록", () => {
    expect(buildRouteWaypoints([])).toEqual([]);
  });
});
