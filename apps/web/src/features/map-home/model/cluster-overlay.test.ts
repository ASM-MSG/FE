import { describe, expect, it } from "vitest";
import { cellCornersAt, cellIndexAt, type LatLng } from "@/entities/cell";
import { gateFillCells } from "./cluster-overlay";
import { GRID_MIN_ZOOM } from "./grid-overlay";
import { toOccupiedOverlays } from "./occupied-grid-overlay";
import type { StyledCellOverlay } from "./theme-overlay";
import { MOCK_OCCUPIED_GRIDS } from "@/test/occupied-grids";

/**
 * MSG-410: FE 로컬 클러스터 산술(buildClusterMarkers·clusterWindowSteps·tierOf)이
 * 서버 집계(region-cluster-overlay)로 대체되며 해당 테스트는 삭제됐다 (AC 10).
 * 존치 대상인 채움 줌 게이트(gateFillCells — MSG-403 AC 7)의 보존 단정만 남긴다.
 */

/** 셸과 동일 입력 경로의 상시 점령 셀 — 경계 내부 필터 완료본 (MSG-263 D3·D9) */
const PERSISTENT = toOccupiedOverlays(MOCK_OCCUPIED_GRIDS);

/** center가 속한 100m 격자 셀로 스냅된 오버레이 셀 — 파생물 입력 형태와 동일 (MSG-357: 꼭짓점 4점) */
const overlayAt = (
  id: string,
  center: LatLng,
  color?: string,
): StyledCellOverlay => ({
  id,
  corners: cellCornersAt(cellIndexAt(center)),
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

describe("gateFillCells — 채움 줌 게이트 (MSG-264 AC 1·2 → MSG-403 AC 7, MSG-410 AC 10 존치)", () => {
  /** 칩 대상 셀 — 테마 색을 가진 게시 셀(핫구역·미션·코스) */
  const CHIP_CELLS = [
    overlayAt("C-1", { lat: 35.156, lng: 129.058 }, "#E8590C"),
    overlayAt("C-2", { lat: 35.159, lng: 129.061 }, "#E8590C"),
  ];

  it("zoom 16(이상)에서는 채움 셀 목록이 그대로 반환된다 (AC 1)", () => {
    expect(gateFillCells(ALL_CELLS, GRID_MIN_ZOOM)).toEqual(ALL_CELLS);
    expect(gateFillCells(ALL_CELLS, 17)).toEqual(ALL_CELLS);
  });

  it("zoom 15(미만)에서 점령·무테마 셀은 채움에서 걷힌다 (AC 2 — 집계 마커로 전환)", () => {
    expect(gateFillCells(PERSISTENT, 15)).toEqual([]);
    expect(gateFillCells(PERSISTENT, 10)).toEqual([]);
  });

  it("칩 대상 셀(테마 색 보유)은 zoom 15 미만에서도 채움으로 남는다 — 500m·1km 줌에서 칩 데이터가 보여야 한다 (MSG-403 AC 7)", () => {
    expect(gateFillCells(CHIP_CELLS, 14)).toEqual(CHIP_CELLS);
    expect(gateFillCells(CHIP_CELLS, 13)).toEqual(CHIP_CELLS);
  });

  it("점령 셀과 칩 셀이 섞여 있으면 저줌에서 칩 셀만 남는다 (MSG-403 AC 7)", () => {
    expect(gateFillCells([...PERSISTENT, ...CHIP_CELLS], 13)).toEqual(
      CHIP_CELLS,
    );
  });
});
