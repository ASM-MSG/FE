import { describe, expect, it } from "vitest";
import {
  GRID_LAT_STEP,
  GRID_LNG_STEP,
  cellBoundsAt,
  cellIndexAt,
  type Bounds,
} from "@/entities/cell";
import { MOCK_DEX } from "@/entities/dex";
import { pointInPolygon, BUSAN_BOUNDARY } from "@/entities/region";
import {
  GRID_MIN_ZOOM,
  buildGridLines,
  buildOccupiedGridCells,
  excludeSectionCells,
} from "./grid-overlay";

/** 서면 일대 뷰포트 — 기본 줌 15 체감 크기(약 1km 남짓) */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.153, lng: 129.053 },
  ne: { lat: 35.163, lng: 129.065 },
};

/** 부산 경계에서 수십 km 떨어진 남해 전용 뷰포트 — 한 화면 버퍼를 더해도 부산 밖 */
const OPEN_SEA_VIEWPORT: Bounds = {
  sw: { lat: 34.5, lng: 129.0 },
  ne: { lat: 34.55, lng: 129.06 },
};

const OCCUPIED = MOCK_DEX.collectedCells.map(({ gridId, center }) => ({
  gridId,
  center,
}));

describe("buildGridLines — 뷰포트 격자선 파생 (MSG-263 AC 2·5·6)", () => {
  it("뷰포트∩부산 범위의 선분만 반환한다 — 선분 중점이 모두 행정경계 내부다 (AC 2·3)", () => {
    const lines = buildGridLines(SEOMYEON_VIEWPORT, 15);

    expect(lines.length).toBeGreaterThan(0);
    for (const { path } of lines) {
      const mid = {
        lat: (path[0].lat + path[1].lat) / 2,
        lng: (path[0].lng + path[1].lng) / 2,
      };
      expect(pointInPolygon(mid, BUSAN_BOUNDARY)).toBe(true);
    }
  });

  it("부산 밖 전용 뷰포트면 빈 배열이다 (AC 2)", () => {
    expect(buildGridLines(OPEN_SEA_VIEWPORT, 15)).toEqual([]);
  });

  it("줌 15 미만이면 빈 결과, 15 이상이면 반환한다 (AC 6, D4)", () => {
    expect(GRID_MIN_ZOOM).toBe(15);
    expect(buildGridLines(SEOMYEON_VIEWPORT, 14)).toEqual([]);
    expect(
      buildGridLines(SEOMYEON_VIEWPORT, GRID_MIN_ZOOM).length,
    ).toBeGreaterThan(0);
    expect(buildGridLines(SEOMYEON_VIEWPORT, 16).length).toBeGreaterThan(0);
  });

  it("파생 도형 수가 셀 수(열×행)가 아닌 선 수(열+행) 규모에 머문다 — 뷰포트 크기 기준 상한 가드 (AC 5)", () => {
    const lines = buildGridLines(SEOMYEON_VIEWPORT, 15);

    // 한 화면 버퍼(양쪽 각 1화면 = 스팬 3배)를 감안한 격자 행·열 수
    const latSpan = SEOMYEON_VIEWPORT.ne.lat - SEOMYEON_VIEWPORT.sw.lat;
    const lngSpan = SEOMYEON_VIEWPORT.ne.lng - SEOMYEON_VIEWPORT.sw.lng;
    const rows = Math.ceil((3 * latSpan) / GRID_LAT_STEP) + 1;
    const cols = Math.ceil((3 * lngSpan) / GRID_LNG_STEP) + 1;

    // 선 규모 상한 — 경계 절단 분절을 넉넉히 잡아도 (행+열)의 상수배
    expect(lines.length).toBeLessThanOrEqual(4 * (rows + cols));
    // 셀 규모(행×열)와는 자릿수가 다르다
    expect(lines.length).toBeLessThan((rows * cols) / 4);
  });

  it("모든 선분은 버퍼 뷰포트 범위 안이다 — 뷰포트 컬링 (AC 2)", () => {
    const lines = buildGridLines(SEOMYEON_VIEWPORT, 15);

    const latSpan = SEOMYEON_VIEWPORT.ne.lat - SEOMYEON_VIEWPORT.sw.lat;
    const lngSpan = SEOMYEON_VIEWPORT.ne.lng - SEOMYEON_VIEWPORT.sw.lng;
    for (const { path } of lines) {
      for (const point of path) {
        expect(point.lat).toBeGreaterThanOrEqual(
          SEOMYEON_VIEWPORT.sw.lat - latSpan,
        );
        expect(point.lat).toBeLessThanOrEqual(
          SEOMYEON_VIEWPORT.ne.lat + latSpan,
        );
        expect(point.lng).toBeGreaterThanOrEqual(
          SEOMYEON_VIEWPORT.sw.lng - lngSpan,
        );
        expect(point.lng).toBeLessThanOrEqual(
          SEOMYEON_VIEWPORT.ne.lng + lngSpan,
        );
      }
    }
  });
});

describe("buildOccupiedGridCells — 점령 셀 격자 스냅 (MSG-263 AC 4·7, D3)", () => {
  it("mock 점령 셀의 center가 소속 격자 셀에 스냅되어 bounds가 격자 셀 bounds와 일치하고, 점령 스타일(occupied)로 표시된다", () => {
    const overlays = buildOccupiedGridCells(OCCUPIED);

    expect(overlays.map((o) => o.id).sort()).toEqual(
      OCCUPIED.map((c) => c.gridId).sort(),
    );
    for (const cell of OCCUPIED) {
      const overlay = overlays.find((o) => o.id === cell.gridId)!;
      expect(overlay.bounds).toEqual(cellBoundsAt(cellIndexAt(cell.center)));
      expect(overlay.occupied).toBe(true);
    }
  });

  it("셀 중심이 행정경계 밖인 셀은 점령 오버레이 대상이 아니다 (AC 4)", () => {
    const withSeaCell = [
      ...OCCUPIED,
      { gridId: "SEA-1", center: { lat: 34.95, lng: 129.0 } },
    ];
    const overlays = buildOccupiedGridCells(withSeaCell);

    expect(overlays.map((o) => o.id)).not.toContain("SEA-1");
    expect(overlays).toHaveLength(OCCUPIED.length);
  });
});

describe("excludeSectionCells — 상시 점령 셀 ∩ 섹션 게시 셀 1회 렌더 (MSG-263 개정 2 AC 8, R6)", () => {
  const persistent = buildOccupiedGridCells(OCCUPIED);

  it("섹션 게시 셀과 id가 겹치는 상시 점령 셀은 렌더 대상에서 제외된다 — 교집합은 섹션(테마) 스타일로 1회만", () => {
    const sectionCells = [
      { id: OCCUPIED[0].gridId },
      { id: OCCUPIED[1].gridId },
    ];
    const visible = excludeSectionCells(persistent, sectionCells);

    expect(visible.map((o) => o.id)).not.toContain(OCCUPIED[0].gridId);
    expect(visible.map((o) => o.id)).not.toContain(OCCUPIED[1].gridId);
    expect(visible).toHaveLength(persistent.length - 2);
  });

  it("겹치지 않는 섹션 게시 셀은 상시 점령 셀을 줄이지 않고, 섹션 게시가 없으면 전체가 유지된다", () => {
    expect(excludeSectionCells(persistent, [{ id: "THEME-ONLY" }])).toEqual(
      persistent,
    );
    expect(excludeSectionCells(persistent, [])).toEqual(persistent);
  });
});
