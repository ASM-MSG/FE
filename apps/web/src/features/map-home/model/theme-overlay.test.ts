import { describe, expect, it } from "vitest";
import {
  cellCornersAt,
  cellIndexAt,
  decodeGridCorners,
  encodeGridId,
  type CellCorners,
} from "@/entities/cell";
import { MOCK_DEX } from "@/entities/dex";
import {
  MOCK_ROUTE,
  MOCK_THEME_CELLS,
  THEME_META,
  themeCellsOf,
} from "./theme";
import { canOpenDetail } from "./home-cell-detail";
import {
  buildHatchLines,
  buildHomeOverlayCells,
  buildRouteOverlay,
  emphasizeCell,
  themeCellGridIds,
} from "./theme-overlay";

// MSG-325: 점령 셀 입력이 서버 gridId 목록으로 바뀌었다 — 목 셀도 center 좌표에서 같은 체계로 파생한다
const OCCUPIED_IDS = MOCK_DEX.collectedCells.map(({ center }) =>
  encodeGridId(center),
);

describe("buildHomeOverlayCells — 기본 상태 (AC 2, MSG-263 개정 2 D9)", () => {
  it("활성 테마가 없으면 아무것도 게시하지 않는다 — 점령 셀 표시는 셸 상시 층(MapShell) 소유다", () => {
    expect(buildHomeOverlayCells(null, [], OCCUPIED_IDS)).toEqual([]);
  });
});

describe("buildHomeOverlayCells — 테마 강조 (AC 6·7)", () => {
  const overlays = buildHomeOverlayCells(
    "hot",
    MOCK_THEME_CELLS.hot,
    OCCUPIED_IDS,
  );

  it("핫구역 활성 시 테마 셀들이 테마 색으로 강조된다 (AC 6)", () => {
    for (const cell of MOCK_THEME_CELLS.hot) {
      const overlay = overlays.find((o) => o.id === encodeGridId(cell.center));
      expect(overlay).toBeDefined();
      expect(overlay!.color).toBe(THEME_META.hot.color);
    }
  });

  it("테마 셀 ∩ 내 점령 셀만 빗금 표시된다 (AC 7)", () => {
    for (const cell of MOCK_THEME_CELLS.hot) {
      const overlay = overlays.find((o) => o.id === encodeGridId(cell.center))!;
      expect(overlay.hatched).toBe(
        OCCUPIED_IDS.includes(encodeGridId(cell.center)),
      );
    }
  });

  it("테마에 속하지 않는 내 점령 셀은 게시하지 않는다 — 셸 상시 층이 그린다 (MSG-263 개정 2 AC 8, D9)", () => {
    const themeGridIds = MOCK_THEME_CELLS.hot.map((c) =>
      encodeGridId(c.center),
    );
    const outside = OCCUPIED_IDS.filter((id) => !themeGridIds.includes(id));
    expect(outside.length).toBeGreaterThan(0);
    for (const id of outside) {
      expect(overlays.find((o) => o.id === id)).toBeUndefined();
    }
  });

  it("게시 목록은 테마 셀뿐이고 중복이 없다 — 교집합 셀은 테마 스타일로 1회만 (개정 2 AC 8)", () => {
    const ids = overlays.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(
      MOCK_THEME_CELLS.hot.map((c) => encodeGridId(c.center)).sort(),
    );
  });

  it("테마 셀 기하도 100m 격자 스냅 꼭짓점 4점이다 — 격자 정의 단일화 (MSG-263 D5 → MSG-357)", () => {
    for (const cell of MOCK_THEME_CELLS.hot) {
      const overlay = overlays.find((o) => o.id === encodeGridId(cell.center))!;
      expect(overlay.corners).toEqual(cellCornersAt(cellIndexAt(cell.center)));
    }
  });

  it("셀 중심이 부산 행정경계 밖인 테마 셀은 오버레이 대상이 아니다 (MSG-263 AC 4)", () => {
    const withSeaCell = [
      ...MOCK_THEME_CELLS.hot,
      { id: "SEA-CELL", center: { lat: 34.95, lng: 129.0 } },
    ];
    const result = buildHomeOverlayCells("hot", withSeaCell, OCCUPIED_IDS);

    expect(result.map((o) => o.id)).not.toContain(
      encodeGridId({ lat: 34.95, lng: 129.0 }),
    );
  });

  it("지역축제·팝업스토어도 같은 규칙으로 각 테마 색을 쓴다 (AC 6)", () => {
    for (const theme of ["festival", "popup"] as const) {
      const themed = buildHomeOverlayCells(
        theme,
        MOCK_THEME_CELLS[theme],
        OCCUPIED_IDS,
      );
      for (const cell of MOCK_THEME_CELLS[theme]) {
        expect(
          themed.find((o) => o.id === encodeGridId(cell.center))!.color,
        ).toBe(THEME_META[theme].color);
      }
    }
  });
});

describe("themeCellGridIds — 탭 판정 id = 게시 id (MSG-325 회귀 방지)", () => {
  // 목 소스 3테마(지역축제·팝업스토어·경로추천)는 셀 id가 목 라벨("A-14")인데 게시 id는
  // 좌표 유래 서버 gridId다. 탭 판정에 목 라벨을 쓰면 상세가 영영 안 열린다 (Codex 리뷰 지적).
  const MOCK_SOURCE_THEMES = ["festival", "popup", "route"] as const;

  it("목 라벨 id로 판정하면 상세가 열리지 않는다 — 회귀 재현", () => {
    for (const theme of MOCK_SOURCE_THEMES) {
      const cells = themeCellsOf(theme);
      const overlays = buildHomeOverlayCells(theme, cells, []);
      const mockLabelIds = cells.map((c) => c.id);

      expect(
        canOpenDetail(theme, overlays[0].id, mockLabelIds, []),
        `${theme}: 목 라벨 id는 게시 id와 다른 체계여야 회귀가 성립한다`,
      ).toBe(false);
    }
  });

  it("themeCellGridIds가 만든 판정 id 집합은 게시 id 집합과 정확히 같다 — 목·API 소스 공통", () => {
    for (const theme of [...MOCK_SOURCE_THEMES, "hot"] as const) {
      const cells = themeCellsOf(theme);
      const overlays = buildHomeOverlayCells(theme, cells, []);

      expect(themeCellGridIds(cells).sort()).toEqual(
        overlays.map((o) => o.id).sort(),
      );
      for (const overlay of overlays) {
        expect(
          canOpenDetail(theme, overlay.id, themeCellGridIds(cells), []),
          `${theme}: 게시된 셀은 탭으로 상세가 열려야 한다`,
        ).toBe(true);
      }
    }
  });

  it("부산 경계 밖 테마 셀은 판정 집합에도 없다 — 게시되지 않은 셀이 탭으로 열리면 안 된다 (MSG-263 AC 4 정합)", () => {
    const SEA_CELL = { id: "SEA-CELL", center: { lat: 34.95, lng: 129.0 } };
    const seaGridId = encodeGridId(SEA_CELL.center);
    const cells = [...MOCK_THEME_CELLS.hot, SEA_CELL];
    const overlays = buildHomeOverlayCells("hot", cells, []);

    expect(overlays.map((o) => o.id)).not.toContain(seaGridId);
    expect(themeCellGridIds(cells)).not.toContain(seaGridId);
    expect(themeCellGridIds(cells).sort()).toEqual(
      overlays.map((o) => o.id).sort(),
    );
    expect(canOpenDetail("hot", seaGridId, themeCellGridIds(cells), [])).toBe(
      false,
    );
  });
});

describe("buildHomeOverlayCells — 경로추천 (AC 8)", () => {
  it("경로 주변 셀은 초록(경로 토큰)으로 강조되고, 경로 셀 ∩ 내 점령 셀은 초록 빗금으로 구분된다 — Figma 경로추천 정본(13848:8440), 검증 재작업 1", () => {
    const overlays = buildHomeOverlayCells(
      "route",
      themeCellsOf("route"),
      OCCUPIED_IDS,
    );

    for (const cell of MOCK_ROUTE.cells) {
      const overlay = overlays.find((o) => o.id === encodeGridId(cell.center))!;
      expect(overlay.color).toBe(THEME_META.route.color);
      expect(overlay.hatched).toBe(
        OCCUPIED_IDS.includes(encodeGridId(cell.center)),
      );
    }

    // 목 경로 셀 3개는 전부 내 점령 — 교집합 케이스가 실제로 시연되는지 고정
    expect(
      MOCK_ROUTE.cells.filter((c) =>
        OCCUPIED_IDS.includes(encodeGridId(c.center)),
      ).length,
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

describe("buildHatchLines — 셀 꼭짓점 4점 안 사선 빗금 기하 (AC 7, R1 · MSG-357 corners 등가 이전)", () => {
  // 축평행 사각 꼭짓점 — 쌍선형 보간이 구 Bounds 산식과 등가임을 같은 기하로 확인한다
  const sw = { lat: 35.155, lng: 129.056 };
  const ne = { lat: 35.159, lng: 129.061 };
  const corners: CellCorners = [
    sw,
    { lat: sw.lat, lng: ne.lng },
    ne,
    { lat: ne.lat, lng: sw.lng },
  ];

  it("요청한 개수의 선분을 만든다", () => {
    expect(buildHatchLines(corners, 5)).toHaveLength(5);
    expect(buildHatchLines(corners, 3)).toHaveLength(3);
  });

  it("모든 선분 끝점은 꼭짓점 사각형 안(경계 포함)에 있다", () => {
    for (const [a, b] of buildHatchLines(corners, 7)) {
      for (const p of [a, b]) {
        expect(p.lat).toBeGreaterThanOrEqual(sw.lat);
        expect(p.lat).toBeLessThanOrEqual(ne.lat);
        expect(p.lng).toBeGreaterThanOrEqual(sw.lng);
        expect(p.lng).toBeLessThanOrEqual(ne.lng);
      }
    }
  });

  it("선분들은 서로 평행한 사선이다 — 정규화 좌표에서 기울기가 일정하다", () => {
    const dLat = ne.lat - sw.lat;
    const dLng = ne.lng - sw.lng;
    for (const [a, b] of buildHatchLines(corners, 5)) {
      const slope = (b.lat - a.lat) / dLat / ((b.lng - a.lng) / dLng);
      expect(slope).toBeCloseTo(-1, 6);
    }
  });

  it("기울어진 꼭짓점 사각형에서도 빗금 끝점이 사각형 내부에 머문다 — 5179 셀 대응 (MSG-357)", () => {
    // 실제 5179 셀 꼭짓점 — 위경도 평면에서 기울어진 사각형
    const tilted = cellCornersAt(cellIndexAt({ lat: 35.1579, lng: 129.0594 }));
    const lats = tilted.map((c) => c.lat);
    const lngs = tilted.map((c) => c.lng);
    for (const [a, b] of buildHatchLines(tilted, 5)) {
      for (const p of [a, b]) {
        expect(p.lat).toBeGreaterThanOrEqual(Math.min(...lats));
        expect(p.lat).toBeLessThanOrEqual(Math.max(...lats));
        expect(p.lng).toBeGreaterThanOrEqual(Math.min(...lngs));
        expect(p.lng).toBeLessThanOrEqual(Math.max(...lngs));
      }
    }
  });
});

describe("emphasizeCell — 재생 중 격자 테두리 강조 (사용자 피드백)", () => {
  const SEOMYEON_ID = encodeGridId({ lat: 35.1579, lng: 129.0594 });
  const baseCell = {
    id: SEOMYEON_ID,
    corners: cellCornersAt(cellIndexAt({ lat: 35.1579, lng: 129.0594 })),
  };

  it("강조 대상이 없으면(null) 입력 목록을 그대로 반환한다", () => {
    const cells = [baseCell];

    expect(emphasizeCell(cells, null, [])).toBe(cells);
  });

  it("게시 목록에 이미 있는 격자면 그 셀에 emphasized만 켠다 — 중복 폴리곤 없음", () => {
    const result = emphasizeCell([baseCell], SEOMYEON_ID, []);

    expect(result).toHaveLength(1);
    expect(result[0].emphasized).toBe(true);
    expect(result[0].id).toBe(SEOMYEON_ID);
  });

  it("게시 목록에 없는 격자면 gridId에서 꼭짓점을 복원한 강조 전용 셀을 덧붙인다", () => {
    const result = emphasizeCell([], SEOMYEON_ID, []);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(SEOMYEON_ID);
    expect(result[0].emphasized).toBe(true);
    expect(result[0].corners).toEqual(decodeGridCorners(SEOMYEON_ID));
    // 원래 채움이 없던 격자 — 테두리 전용이 정당 (점령 스타일 미부여)
    expect(result[0].occupied).toBeUndefined();
  });

  it("점령 격자를 강조하면 점령 채움 스타일이 보존된다 — 셸이 게시 id와 겹치는 상시 점령 셀을 제외하므로(excludeSectionCells) 강조 셀이 채움을 이어받아야 한다 (사용자 버그 — 채움 텅 빔)", () => {
    const result = emphasizeCell([], SEOMYEON_ID, [SEOMYEON_ID]);

    expect(result).toHaveLength(1);
    expect(result[0].emphasized).toBe(true);
    expect(result[0].occupied).toBe(true);
  });
});
