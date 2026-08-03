import { describe, expect, it } from "vitest";
import { cellBoundsAt, cellIndexAt } from "@/entities/cell";
import { MOCK_DEX } from "@/entities/dex";
import {
  MOCK_ROUTE,
  MOCK_THEME_CELLS,
  THEME_META,
  themeCellsOf,
} from "./theme";
import {
  buildHatchLines,
  buildHomeOverlayCells,
  buildRouteOverlay,
} from "./theme-overlay";

const OCCUPIED = MOCK_DEX.collectedCells.map(({ gridId, center }) => ({
  gridId,
  center,
}));
const OCCUPIED_IDS = OCCUPIED.map((c) => c.gridId);

describe("buildHomeOverlayCells — 기본 상태 (AC 2, MSG-263 개정 2 D9)", () => {
  it("활성 테마가 없으면 아무것도 게시하지 않는다 — 점령 셀 표시는 셸 상시 층(MapShell) 소유다", () => {
    expect(buildHomeOverlayCells(null, [], OCCUPIED)).toEqual([]);
  });
});

describe("buildHomeOverlayCells — 테마 강조 (AC 6·7)", () => {
  const overlays = buildHomeOverlayCells("hot", MOCK_THEME_CELLS.hot, OCCUPIED);

  it("핫구역 활성 시 테마 셀들이 테마 색으로 강조된다 (AC 6)", () => {
    for (const cell of MOCK_THEME_CELLS.hot) {
      const overlay = overlays.find((o) => o.id === cell.id);
      expect(overlay).toBeDefined();
      expect(overlay!.color).toBe(THEME_META.hot.color);
    }
  });

  it("테마 셀 ∩ 내 점령 셀만 빗금 표시된다 (AC 7)", () => {
    for (const cell of MOCK_THEME_CELLS.hot) {
      const overlay = overlays.find((o) => o.id === cell.id)!;
      expect(overlay.hatched).toBe(OCCUPIED_IDS.includes(cell.id));
    }
  });

  it("테마에 속하지 않는 내 점령 셀은 게시하지 않는다 — 셸 상시 층이 그린다 (MSG-263 개정 2 AC 8, D9)", () => {
    const outside = OCCUPIED_IDS.filter(
      (id) => !MOCK_THEME_CELLS.hot.some((c) => c.id === id),
    );
    expect(outside.length).toBeGreaterThan(0);
    for (const id of outside) {
      expect(overlays.find((o) => o.id === id)).toBeUndefined();
    }
  });

  it("게시 목록은 테마 셀뿐이고 중복이 없다 — 교집합 셀은 테마 스타일로 1회만 (개정 2 AC 8)", () => {
    const ids = overlays.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(MOCK_THEME_CELLS.hot.map((c) => c.id).sort());
  });

  it("테마 셀 bounds도 100m 격자 스냅이다 — 500m/100m 혼재 불허 (MSG-263 D5·AC 8)", () => {
    for (const cell of MOCK_THEME_CELLS.hot) {
      const overlay = overlays.find((o) => o.id === cell.id)!;
      expect(overlay.bounds).toEqual(cellBoundsAt(cellIndexAt(cell.center)));
    }
  });

  it("셀 중심이 부산 행정경계 밖인 테마 셀은 오버레이 대상이 아니다 (MSG-263 AC 4)", () => {
    const withSeaCell = [
      ...MOCK_THEME_CELLS.hot,
      { id: "SEA-CELL", center: { lat: 34.95, lng: 129.0 } },
    ];
    const result = buildHomeOverlayCells("hot", withSeaCell, OCCUPIED);

    expect(result.map((o) => o.id)).not.toContain("SEA-CELL");
  });

  it("지역축제·팝업스토어도 같은 규칙으로 각 테마 색을 쓴다 (AC 6)", () => {
    for (const theme of ["festival", "popup"] as const) {
      const themed = buildHomeOverlayCells(
        theme,
        MOCK_THEME_CELLS[theme],
        OCCUPIED,
      );
      for (const cell of MOCK_THEME_CELLS[theme]) {
        expect(themed.find((o) => o.id === cell.id)!.color).toBe(
          THEME_META[theme].color,
        );
      }
    }
  });
});

describe("buildHomeOverlayCells — 경로추천 (AC 8)", () => {
  it("경로 주변 셀은 초록(경로 토큰)으로 강조되고, 경로 셀 ∩ 내 점령 셀은 초록 빗금으로 구분된다 — Figma 경로추천 정본(13848:8440), 검증 재작업 1", () => {
    const overlays = buildHomeOverlayCells(
      "route",
      themeCellsOf("route"),
      OCCUPIED,
    );

    for (const cell of MOCK_ROUTE.cells) {
      const overlay = overlays.find((o) => o.id === cell.id)!;
      expect(overlay.color).toBe(THEME_META.route.color);
      expect(overlay.hatched).toBe(OCCUPIED_IDS.includes(cell.id));
    }

    // 목 경로 셀 3개는 전부 내 점령 — 교집합 케이스가 실제로 시연되는지 고정
    expect(
      MOCK_ROUTE.cells.filter((c) => OCCUPIED_IDS.includes(c.id)).length,
    ).toBeGreaterThan(0);
  });
});

describe("buildRouteOverlay — 경로 데이터 게시 분기 (AC 8)", () => {
  it("경로추천 활성 시에만 경로(연결선 정점 + 번호 경유지 + 경로 색)를 게시한다", () => {
    const route = buildRouteOverlay("route", MOCK_ROUTE);

    expect(route).not.toBeNull();
    expect(route!.path).toEqual(MOCK_ROUTE.path);
    expect(route!.waypoints).toEqual(MOCK_ROUTE.waypoints);
    expect(route!.color).toBe(THEME_META.route.color);
  });

  it("비활성·다른 테마에서는 경로를 게시하지 않는다 (AC 2·6)", () => {
    expect(buildRouteOverlay(null, MOCK_ROUTE)).toBeNull();
    expect(buildRouteOverlay("hot", MOCK_ROUTE)).toBeNull();
    expect(buildRouteOverlay("festival", MOCK_ROUTE)).toBeNull();
    expect(buildRouteOverlay("popup", MOCK_ROUTE)).toBeNull();
  });
});

describe("buildHatchLines — 셀 Bounds 안 사선 빗금 기하 (AC 7, R1)", () => {
  const bounds = {
    sw: { lat: 35.155, lng: 129.056 },
    ne: { lat: 35.159, lng: 129.061 },
  };

  it("요청한 개수의 선분을 만든다", () => {
    expect(buildHatchLines(bounds, 5)).toHaveLength(5);
    expect(buildHatchLines(bounds, 3)).toHaveLength(3);
  });

  it("모든 선분 끝점은 Bounds 안(경계 포함)에 있다", () => {
    for (const [a, b] of buildHatchLines(bounds, 7)) {
      for (const p of [a, b]) {
        expect(p.lat).toBeGreaterThanOrEqual(bounds.sw.lat);
        expect(p.lat).toBeLessThanOrEqual(bounds.ne.lat);
        expect(p.lng).toBeGreaterThanOrEqual(bounds.sw.lng);
        expect(p.lng).toBeLessThanOrEqual(bounds.ne.lng);
      }
    }
  });

  it("선분들은 서로 평행한 사선이다 — 정규화 좌표에서 기울기가 일정하다", () => {
    const dLat = bounds.ne.lat - bounds.sw.lat;
    const dLng = bounds.ne.lng - bounds.sw.lng;
    for (const [a, b] of buildHatchLines(bounds, 5)) {
      const slope = (b.lat - a.lat) / dLat / ((b.lng - a.lng) / dLng);
      expect(slope).toBeCloseTo(-1, 6);
    }
  });
});
