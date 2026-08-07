import { describe, expect, it } from "vitest";
import {
  GRID_ORIGIN,
  cellBoundsAt,
  cellIndexAt,
  type Bounds,
  type LatLng,
} from "@/entities/cell";
import {
  buildClusterMarkers,
  clusterWindowSteps,
  gateFillCells,
  selectClusterSource,
  tierOf,
  type ClusterMarker,
} from "./cluster-overlay";
import { GRID_MIN_ZOOM, buildGridLines } from "./grid-overlay";
import { toOccupiedOverlays } from "./occupied-grid-overlay";
import type { StyledCellOverlay } from "./theme-overlay";
import { MOCK_OCCUPIED_GRIDS } from "@/test/occupied-grids";

/** 서면 일대 뷰포트 — grid-overlay.test와 동일 기준 (AC 2 격자선 게이트 단정용) */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.153, lng: 129.053 },
  ne: { lat: 35.163, lng: 129.065 },
};

/** 셸과 동일 입력 경로의 상시 점령 셀 — 경계 내부 필터 완료본 (MSG-263 D3·D9) */
const PERSISTENT = toOccupiedOverlays(MOCK_OCCUPIED_GRIDS);

/** center가 속한 100m 격자 셀로 스냅된 오버레이 셀 — 파생물 입력 형태와 동일 */
const overlayAt = (
  id: string,
  center: LatLng,
  color?: string,
): StyledCellOverlay => ({
  id,
  bounds: cellBoundsAt(cellIndexAt(center)),
  ...(color !== undefined && { color }),
});

/** 서면 일대에 600~700m 간격으로 흩어진 합성 셀 3×3 — 전부 부산 행정경계 내부 */
const SEOMYEON_SPREAD: StyledCellOverlay[] = Array.from({ length: 9 }, (_, i) =>
  overlayAt(`S-${i}`, {
    lat: 35.152 + Math.floor(i / 3) * 0.006,
    lng: 129.054 + (i % 3) * 0.007,
  }),
);

const ALL_CELLS = [...PERSISTENT, ...SEOMYEON_SPREAD];

const sumCount = (markers: ClusterMarker[]): number =>
  markers.reduce((sum, m) => sum + m.count, 0);

describe("gateFillCells — 채움 줌 게이트 (MSG-264 AC 1·2, A5 전 섹션 공유)", () => {
  it("zoom 15(이상)에서는 채움 셀 목록이 그대로 반환된다 (AC 1)", () => {
    expect(gateFillCells(ALL_CELLS, GRID_MIN_ZOOM)).toEqual(ALL_CELLS);
    expect(gateFillCells(ALL_CELLS, 16)).toEqual(ALL_CELLS);
  });

  it("zoom 14(미만)에서는 채움 셀이 파생되지 않는다 (AC 2)", () => {
    expect(gateFillCells(ALL_CELLS, 14)).toEqual([]);
    expect(gateFillCells(ALL_CELLS, 10)).toEqual([]);
  });
});

describe("buildClusterMarkers — 그리드 윈도 클러스터링 (MSG-264)", () => {
  it("zoom 15(이상) 입력에는 클러스터가 파생되지 않는다 (AC 1)", () => {
    expect(buildClusterMarkers(ALL_CELLS, GRID_MIN_ZOOM)).toEqual([]);
    expect(buildClusterMarkers(ALL_CELLS, 16)).toEqual([]);
  });

  it("zoom 14에서는 클러스터가 파생되고 채움 셀·격자선은 파생되지 않는다 — 경계값 15/14 양쪽 (AC 2)", () => {
    expect(buildClusterMarkers(ALL_CELLS, 14).length).toBeGreaterThan(0);
    expect(gateFillCells(ALL_CELLS, 14)).toEqual([]);
    expect(buildGridLines(SEOMYEON_VIEWPORT, 14)).toEqual([]);
  });

  it("클러스터 배지 숫자의 합 = 집계 대상 셀 수 — 어떤 셀도 누락·중복 집계되지 않는다 (AC 4)", () => {
    for (const zoom of [14, 13, 12]) {
      expect(sumCount(buildClusterMarkers(ALL_CELLS, zoom))).toBe(
        ALL_CELLS.length,
      );
    }
  });

  it("집계 대상 셀이 0개면 클러스터 마커도 0개다 (AC 10)", () => {
    expect(buildClusterMarkers([], 13)).toEqual([]);
  });

  it("부산 행정경계 밖 center 셀은 어떤 클러스터 count에도 들어가지 않는다 (AC 11)", () => {
    const withSeaCell = [
      ...ALL_CELLS,
      overlayAt("SEA-1", { lat: 34.95, lng: 129.0 }),
    ];
    expect(sumCount(buildClusterMarkers(withSeaCell, 13))).toBe(
      ALL_CELLS.length,
    );
  });

  it("줌 1단 아웃 시 윈도가 2배로 커져 재묶기된다 — zoom 13 같은 윈도의 두 셀이 zoom 14에서는 분리 (AC 6)", () => {
    const s13 = clusterWindowSteps(13);
    const s14 = clusterWindowSteps(14);
    expect(s13.lat).toBeCloseTo(2 * s14.lat, 12);
    expect(s13.lng).toBeCloseTo(2 * s14.lng, 12);

    // 서면 근방의 zoom 13 윈도 하나를 골라 그 안 0.25·0.75 지점에 셀 배치 —
    // zoom 14 윈도(절반 크기)로는 서로 다른 윈도에 떨어진다
    const row = Math.round((35.157 - GRID_ORIGIN.lat) / s13.lat);
    const col = Math.round((129.059 - GRID_ORIGIN.lng) / s13.lng);
    const lng = GRID_ORIGIN.lng + (col + 0.5) * s13.lng;
    const pair = [
      overlayAt("P-1", { lat: GRID_ORIGIN.lat + (row + 0.25) * s13.lat, lng }),
      overlayAt("P-2", { lat: GRID_ORIGIN.lat + (row + 0.75) * s13.lat, lng }),
    ];

    expect(buildClusterMarkers(pair, 14)).toHaveLength(2);
    const merged = buildClusterMarkers(pair, 13);
    expect(merged).toHaveLength(1);
    expect(merged[0].count).toBe(2);

    // 클릭 줌 인 대상 bounds = 멤버 셀 bounds 합집합
    expect(merged[0].bounds.sw.lat).toBeCloseTo(pair[0].bounds.sw.lat, 10);
    expect(merged[0].bounds.ne.lat).toBeCloseTo(pair[1].bounds.ne.lat, 10);
    expect(merged[0].bounds.sw.lng).toBeCloseTo(pair[0].bounds.sw.lng, 10);
    expect(merged[0].bounds.ne.lng).toBeCloseTo(pair[0].bounds.ne.lng, 10);

    // 전체 셀에서도 줌 아웃이 클러스터 수를 늘리지 않는다
    expect(buildClusterMarkers(ALL_CELLS, 12).length).toBeLessThanOrEqual(
      buildClusterMarkers(ALL_CELLS, 14).length,
    );
  });

  it("같은 줌 마커 쌍 사이 거리가 윈도 절반 이상이고 마커는 윈도 중앙부(1/2 영역)에 클램프된다 (AC 7, A1)", () => {
    for (const zoom of [14, 13, 12]) {
      const markers = buildClusterMarkers(ALL_CELLS, zoom);
      const step = clusterWindowSteps(zoom);

      for (const marker of markers) {
        // 윈도 내 위치 비율 — 중앙 1/2 영역([0.25, 0.75]) 클램프
        const fracLat =
          (marker.position.lat - GRID_ORIGIN.lat) / step.lat -
          Math.floor((marker.position.lat - GRID_ORIGIN.lat) / step.lat);
        const fracLng =
          (marker.position.lng - GRID_ORIGIN.lng) / step.lng -
          Math.floor((marker.position.lng - GRID_ORIGIN.lng) / step.lng);
        expect(fracLat).toBeGreaterThanOrEqual(0.25 - 1e-9);
        expect(fracLat).toBeLessThanOrEqual(0.75 + 1e-9);
        expect(fracLng).toBeGreaterThanOrEqual(0.25 - 1e-9);
        expect(fracLng).toBeLessThanOrEqual(0.75 + 1e-9);
      }

      // 겹침 방지 최소 간격 — 어느 마커 쌍도 정규화 체비쇼프 거리 0.5 윈도 미만으로 붙지 않는다
      for (let i = 0; i < markers.length; i++) {
        for (let j = i + 1; j < markers.length; j++) {
          const dLat =
            Math.abs(markers[i].position.lat - markers[j].position.lat) /
            step.lat;
          const dLng =
            Math.abs(markers[i].position.lng - markers[j].position.lng) /
            step.lng;
          expect(Math.max(dLat, dLng)).toBeGreaterThanOrEqual(0.5 - 1e-9);
        }
      }
    }
  });
});

describe("tierOf — 묶인 수의 3단계 tier 매핑 (MSG-264 AC 5, A2)", () => {
  it("1~2개 = tier 1, 3~5개 = tier 2, 6개 이상 = tier 3", () => {
    expect(tierOf(1)).toBe(1);
    expect(tierOf(2)).toBe(1);
    expect(tierOf(3)).toBe(2);
    expect(tierOf(5)).toBe(2);
    expect(tierOf(6)).toBe(3);
    expect(tierOf(40)).toBe(3);
  });

  it("파생된 모든 마커의 tier가 count의 tierOf와 일치한다", () => {
    const markers = buildClusterMarkers(ALL_CELLS, 12);
    expect(markers.length).toBeGreaterThan(0);
    for (const marker of markers) {
      expect(marker.tier).toBe(tierOf(marker.count));
    }
  });
});

describe("selectClusterSource — 집계 소스 선택 (MSG-264 AC 9)", () => {
  const themedCells = [
    overlayAt("T-1", { lat: 35.156, lng: 129.058 }, "#E8590C"),
    overlayAt("T-2", { lat: 35.159, lng: 129.061 }, "#E8590C"),
  ];

  it("섹션 게시 셀이 있으면 그 셀 기준으로 집계하고 첫 셀의 테마 색을 전승한다", () => {
    expect(selectClusterSource(themedCells, PERSISTENT)).toEqual({
      cells: themedCells,
      color: "#E8590C",
    });
  });

  it("게시 셀이 없으면 상시 점령 셀 기준·color 미지정(primary)이다", () => {
    const source = selectClusterSource([], PERSISTENT);
    expect(source.cells).toBe(PERSISTENT);
    expect(source.color).toBeUndefined();
  });

  it("마커 색은 멤버 셀의 테마 색을 전승하고, 점령 셀 소스 마커는 color 미지정(primary)이다", () => {
    const themedMarkers = buildClusterMarkers(themedCells, 13);
    expect(themedMarkers.length).toBeGreaterThan(0);
    for (const marker of themedMarkers) {
      expect(marker.color).toBe("#E8590C");
    }

    const occupiedMarkers = buildClusterMarkers(PERSISTENT, 13);
    expect(occupiedMarkers.length).toBeGreaterThan(0);
    for (const marker of occupiedMarkers) {
      expect(marker.color).toBeUndefined();
    }
  });
});
