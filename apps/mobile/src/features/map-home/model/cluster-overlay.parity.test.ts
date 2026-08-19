import { describe, expect, it } from "vitest";
import {
  cellIndexAt,
  type GridCellIndex,
} from "../../../entities/cell/model/grid";
import { GRID_MIN_ZOOM } from "./visible-grid";
import {
  gateOccupiedFill,
  isBelowGridZoom,
  isZoomGatedLayer,
  type FillLayer,
} from "./cluster-overlay";

/**
 * L3 확장: 채움 층 줌 게이트가 웹 원본 `gateFillCells`와 동치다 (MSG-428 재작업 1회차).
 *
 * 웹은 병합된 `StyledCellOverlay[]` 하나를 받아 **`cell.color !== undefined`** 로 판별한다
 * (색 없는 점령·강조 셀만 걷고, 테마 색 보유 셀은 저줌에서도 남긴다 — MSG-403 AC 7).
 * 모바일은 같은 셀을 prop 4개(`occupiedCells`·`themeCells`·`hatchCells`·`route`)로 쪼개
 * 넘기므로 그 판별자가 "어느 층인가"로 표현된다. 이 대응이 동치임을 여기서 대조한다.
 *
 * 웹 원본은 변수 경로 동적 import (map-query-policy.parity.test.ts 선례).
 */
const WEB_CLUSTER_OVERLAY_PATH = new URL(
  "../../../../../web/src/features/map-home/model/cluster-overlay.ts",
  import.meta.url,
).pathname;

/** 웹 StyledCellOverlay — corners는 게이트가 보지 않으므로 형태만 맞춘다 */
interface WebStyledCell {
  id: string;
  corners: { lat: number; lng: number }[];
  color?: string;
}

interface WebClusterOverlay {
  gateFillCells: (cells: WebStyledCell[], zoom: number) => WebStyledCell[];
}

const loadWebClusterOverlay = (): Promise<WebClusterOverlay> =>
  import(WEB_CLUSTER_OVERLAY_PATH);

/** zoom 유효 범위 전건(6~21) + 범위 밖·NaN */
const ZOOM_SAMPLES = [
  -1,
  0,
  ...Array.from({ length: 16 }, (_, i) => 6 + i),
  22,
  Number.NaN,
];

/** 서면 일대 점령 셀 표본 — 모바일 층은 색 없는 격자 인덱스만 넘긴다 */
const OCCUPIED_CELLS: GridCellIndex[] = [
  cellIndexAt({ lat: 35.1579, lng: 129.0594 }),
  cellIndexAt({ lat: 35.1591, lng: 129.0607 }),
];

/** 테마 원색 — 웹에서 색 보유 셀(칩 대상)을 만드는 값 */
const THEME_COLOR = "#E8590C";

const CORNERS = [{ lat: 35.1579, lng: 129.0594 }];

const webCellForLayer = (layer: FillLayer): WebStyledCell =>
  layer === "occupied"
    ? { id: `${layer}-1`, corners: CORNERS }
    : { id: `${layer}-1`, corners: CORNERS, color: THEME_COLOR };

const ALL_LAYERS: FillLayer[] = ["occupied", "theme", "hatch", "route"];

describe("채움 줌 게이트 동등성 — 웹 gateFillCells 대조 (L3 확장)", () => {
  it("웹의 색 판별자(cell.color !== undefined)와 모바일 층 분기가 zoom 전건에서 동치다", async () => {
    const web = await loadWebClusterOverlay();

    for (const layer of ALL_LAYERS) {
      const webCells = [webCellForLayer(layer)];
      for (const zoom of ZOOM_SAMPLES) {
        const survivesInWeb = web.gateFillCells(webCells, zoom).length > 0;
        // 모바일: 게이트 대상 층은 실제 게이트를 통과시켜 판정하고,
        // 테마 층은 게이트를 거치지 않으므로 prop이 그대로 지도에 간다(항상 생존)
        const survivesInMobile = isZoomGatedLayer(layer)
          ? gateOccupiedFill(OCCUPIED_CELLS, isBelowGridZoom(zoom)).length > 0
          : true;

        expect(survivesInMobile).toBe(survivesInWeb);
      }
    }
  });

  it("점령 층(색 없음)은 zoom 16 이상에서만 남는다 — 웹 gateFillCells와 임계가 같다", async () => {
    const web = await loadWebClusterOverlay();
    const occupiedWebCells = [webCellForLayer("occupied")];

    for (const zoom of ZOOM_SAMPLES) {
      expect(
        gateOccupiedFill(OCCUPIED_CELLS, isBelowGridZoom(zoom)).length > 0,
      ).toBe(web.gateFillCells(occupiedWebCells, zoom).length > 0);
    }
    expect(
      gateOccupiedFill(OCCUPIED_CELLS, isBelowGridZoom(GRID_MIN_ZOOM)),
    ).toEqual(OCCUPIED_CELLS);
    expect(
      gateOccupiedFill(OCCUPIED_CELLS, isBelowGridZoom(GRID_MIN_ZOOM - 1)),
    ).toEqual([]);
  });

  it("점령 셀과 테마 셀이 섞인 웹 목록에서 저줌에 남는 것은 테마 셀뿐이고, 모바일도 테마 층만 남긴다 (MSG-403 AC 7)", async () => {
    const web = await loadWebClusterOverlay();
    const mixed = ALL_LAYERS.map(webCellForLayer);

    const survivors = web.gateFillCells(mixed, 13).map((cell) => cell.id);
    expect(survivors).toEqual(["theme-1", "hatch-1", "route-1"]);
    // 모바일 대응: 걷히는 층은 occupied 하나뿐이다
    expect(ALL_LAYERS.filter((layer) => !isZoomGatedLayer(layer))).toEqual([
      "theme",
      "hatch",
      "route",
    ]);
  });

  it("undefined 입력(층 미전달)은 빈 목록으로 다룬다 — 지도 prop이 옵셔널이다", () => {
    expect(gateOccupiedFill(undefined, isBelowGridZoom(18))).toEqual([]);
    expect(gateOccupiedFill(undefined, isBelowGridZoom(12))).toEqual([]);
  });
});

describe("저줌 판정자 isBelowGridZoom — 상태로 들 값 (MSG-428 재작업 2회차)", () => {
  it("웹 게이트의 임계와 같은 지점에서 뒤집힌다 — zoom 전건 대조", async () => {
    const web = await loadWebClusterOverlay();
    const occupiedWebCells = [webCellForLayer("occupied")];

    for (const zoom of ZOOM_SAMPLES) {
      // 웹에서 걷히면(생존 0) 모바일 판정은 "저줌(true)"이어야 한다
      expect(isBelowGridZoom(zoom)).toBe(
        web.gateFillCells(occupiedWebCells, zoom).length === 0,
      );
    }
  });

  it("임계 같은 편의 연속 zoom 값은 모두 같은 판정을 낸다 — 판정 상태는 임계를 넘는 순간에만 바뀐다", () => {
    // 핀치 한 번에 프레임마다 들어오는 소수 줌들 (임계 아래 / 임계 위)
    const belowFrames = [10, 12.4, 14.7, 15.01, 15.999];
    const aboveFrames = [GRID_MIN_ZOOM, 16.2, 17.5, 19.8, 21];

    expect(belowFrames.map(isBelowGridZoom)).toEqual(
      belowFrames.map(() => true),
    );
    expect(aboveFrames.map(isBelowGridZoom)).toEqual(
      aboveFrames.map(() => false),
    );
  });

  it("판정이 같으면 걷힌 결과도 같은 참조다 — 저줌 프레임마다 새 배열을 만들지 않는다", () => {
    expect(gateOccupiedFill(OCCUPIED_CELLS, true)).toBe(
      gateOccupiedFill(OCCUPIED_CELLS, true),
    );
  });
});
