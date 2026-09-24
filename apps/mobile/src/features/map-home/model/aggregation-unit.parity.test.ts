import { describe, expect, it } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";
import { MAP_SCALE_16KM_ZOOM } from "./map-scale";
import { GRID_MIN_ZOOM, buildVisibleCells } from "./visible-grid";
import { cellIndexAt } from "../../../entities/cell/model/grid";
import {
  gateOccupiedFill,
  isBelowGridZoom,
  isZoomGatedLayer,
} from "./cluster-overlay";
import * as mobileAggregationUnit from "./aggregation-unit";

/**
 * L2·L3·L4·L5·L6: 줌 → 집계 단위 판정과 bbox 상한 클램프가 웹 원본과 전건 동일하고,
 * 격자 층과 마커 층이 상호 배타이며, 줌 하한이 시(SIDO) 구간 안에 있다 (MSG-428 → MSG-574).
 *
 * SIDO를 단위 테이블에서 빼지 않고 남긴 이유(MSG-428 승인 Q2): 시그니처를 웹과 같게 둬야
 * 전건 비교가 성립한다. MSG-428은 하한(8km 단)으로 SIDO를 "도달 불가"로 막았고, MSG-574가
 * 하한을 16km 단으로 내려 SIDO 구간의 가장 좁은 끝만 열었다 — L6이 그 경계를 단정한다.
 *
 * 웹 원본은 변수 경로 동적 import (map-query-policy.parity.test.ts 선례).
 */
const WEB_AGGREGATION_UNIT_PATH = new URL(
  "../../../../../web/src/features/map-home/model/aggregation-unit.ts",
  import.meta.url,
).pathname;

interface WebAggregationUnit {
  aggregationUnitForZoom: typeof mobileAggregationUnit.aggregationUnitForZoom;
  AGGREGATION_SPAN_CAP_DEG: typeof mobileAggregationUnit.AGGREGATION_SPAN_CAP_DEG;
  clampBoundsToSpan: typeof mobileAggregationUnit.clampBoundsToSpan;
  drillInZoomForUnit: typeof mobileAggregationUnit.drillInZoomForUnit;
}

const loadWebAggregationUnit = (): Promise<WebAggregationUnit> =>
  import(WEB_AGGREGATION_UNIT_PATH);

/** zoom 유효 범위 전건 + 범위 밖·NaN */
const ZOOM_SAMPLES = [
  -1,
  0,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  Number.NaN,
];

const boundsOf = (
  swLat: number,
  swLng: number,
  neLat: number,
  neLng: number,
): Bounds => ({
  sw: { lat: swLat, lng: swLng },
  ne: { lat: neLat, lng: neLng },
});

/** 부산 표본 — 상한 이내·정확히 상한·위도 초과·경도 초과·음수 좌표 */
const BOUNDS_SAMPLES: Bounds[] = [
  boundsOf(35.15, 129.05, 35.17, 129.07), // 서면 근방 통상 뷰포트
  boundsOf(34.9, 128.6, 35.9, 129.6), // 한 변 정확히 1.0도 (DONG 상한 경계)
  boundsOf(34.5, 128.6, 36.5, 129.6), // 위도 span 초과
  boundsOf(34.9, 127.6, 35.9, 129.6), // 경도 span 초과
  boundsOf(-0.5, -0.5, 0.5, 0.5), // 음수 좌표
];

describe("aggregation-unit 동등성 (L2·L4·L5)", () => {
  it("aggregationUnitForZoom이 zoom 전건에서 웹과 같은 단위를 반환한다 — ≥16 null / 14~15 DONG / 10~13 SIGUNGU / 6~9 SIDO (L2)", async () => {
    const web = await loadWebAggregationUnit();

    for (const zoom of ZOOM_SAMPLES) {
      expect(mobileAggregationUnit.aggregationUnitForZoom(zoom)).toBe(
        web.aggregationUnitForZoom(zoom),
      );
    }
    expect(mobileAggregationUnit.aggregationUnitForZoom(16)).toBeNull();
    expect(mobileAggregationUnit.aggregationUnitForZoom(21)).toBeNull();
    expect(mobileAggregationUnit.aggregationUnitForZoom(15)).toBe("DONG");
    expect(mobileAggregationUnit.aggregationUnitForZoom(14)).toBe("DONG");
    expect(mobileAggregationUnit.aggregationUnitForZoom(13)).toBe("SIGUNGU");
    expect(mobileAggregationUnit.aggregationUnitForZoom(10)).toBe("SIGUNGU");
    expect(mobileAggregationUnit.aggregationUnitForZoom(9)).toBe("SIDO");
    expect(mobileAggregationUnit.aggregationUnitForZoom(6)).toBe("SIDO");
  });

  it("AGGREGATION_SPAN_CAP_DEG가 웹 정본(DONG 1·SIGUNGU 4·SIDO 10도)과 같다 (L4)", async () => {
    const web = await loadWebAggregationUnit();

    expect(mobileAggregationUnit.AGGREGATION_SPAN_CAP_DEG).toEqual(
      web.AGGREGATION_SPAN_CAP_DEG,
    );
    expect(mobileAggregationUnit.AGGREGATION_SPAN_CAP_DEG).toEqual({
      DONG: 1.0,
      SIGUNGU: 4.0,
      SIDO: 10.0,
    });
  });

  it("clampBoundsToSpan이 부산 표본 전건에서 웹과 같은 Bounds를 반환한다 (L4)", async () => {
    const web = await loadWebAggregationUnit();

    for (const bounds of BOUNDS_SAMPLES) {
      for (const unit of ["DONG", "SIGUNGU", "SIDO"] as const) {
        const cap = mobileAggregationUnit.AGGREGATION_SPAN_CAP_DEG[unit];
        expect(mobileAggregationUnit.clampBoundsToSpan(bounds, cap)).toEqual(
          web.clampBoundsToSpan(bounds, cap),
        );
      }
    }
    // 상한 이내는 손대지 않고, 초과 축만 중심 기준으로 잘린다
    expect(
      mobileAggregationUnit.clampBoundsToSpan(BOUNDS_SAMPLES[0], 1.0),
    ).toEqual(BOUNDS_SAMPLES[0]);
    expect(
      mobileAggregationUnit.clampBoundsToSpan(BOUNDS_SAMPLES[2], 1.0),
    ).toEqual(boundsOf(35, 128.6, 36, 129.6));
  });

  it("drillInZoomForUnit이 동→16(개별 격자)·구→14(500m)이고 웹과 전건 일치한다 (L5)", async () => {
    const web = await loadWebAggregationUnit();

    for (const unit of ["DONG", "SIGUNGU", "SIDO"] as const) {
      expect(mobileAggregationUnit.drillInZoomForUnit(unit)).toBe(
        web.drillInZoomForUnit(unit),
      );
    }
    expect(mobileAggregationUnit.drillInZoomForUnit("DONG")).toBe(16);
    expect(mobileAggregationUnit.drillInZoomForUnit("SIGUNGU")).toBe(14);
  });
});

describe("격자 층 · 마커 층 상호 배타 (L3)", () => {
  /** 서면 일대 — 격자가 실제로 파생되는 뷰포트 */
  const viewport = boundsOf(35.1575, 129.0585, 35.1595, 129.061);

  it("모바일 GRID_MIN_ZOOM이 웹 정본과 같은 16이다 — 드리프트 보수 (L3)", async () => {
    const webGridOverlay = (await import(
      new URL(
        "../../../../../web/src/features/map-home/model/grid-overlay.ts",
        import.meta.url,
      ).pathname
    )) as { GRID_MIN_ZOOM: number };

    expect(GRID_MIN_ZOOM).toBe(webGridOverlay.GRID_MIN_ZOOM);
    expect(GRID_MIN_ZOOM).toBe(16);
  });

  it("zoom 6~21 전건에서 격자와 집계 마커가 동시에 뜨는 zoom이 없다 (L3)", () => {
    for (let zoom = 6; zoom <= 21; zoom++) {
      const hasCells = buildVisibleCells(viewport, zoom).length > 0;
      const hasMarkers =
        mobileAggregationUnit.aggregationUnitForZoom(zoom) !== null;
      expect(hasCells && hasMarkers).toBe(false);
      // 두 층 중 정확히 하나는 켜져 있다 — 빈 지도 구간도 없다
      expect(hasCells || hasMarkers).toBe(true);
    }
  });

  /**
   * L3 확장 (재작업 1회차) — 위 단정은 **배경 격자선**(buildVisibleCells)만 덮었다.
   * 점령 채움은 지도에 별도 prop(`occupiedCells`)으로 가는 다른 층이라 그 게이트 밖이었고,
   * 그래서 저줌에서 채움과 마커가 공존하던 결함을 이 기준이 잡지 못했다(codex 리뷰 지적).
   * 채움 층도 같은 상호 배타를 만족해야 S1("두 층이 동시에 보이는 순간 없음")이 성립한다.
   */
  const OCCUPIED_CELLS = [
    cellIndexAt({ lat: 35.1579, lng: 129.0594 }),
    cellIndexAt({ lat: 35.1591, lng: 129.0607 }),
  ];

  it("zoom 6~21 전건에서 점령 채움 층과 집계 마커가 동시에 뜨는 zoom이 없다 (L3 확장)", () => {
    for (let zoom = 6; zoom <= 21; zoom++) {
      const hasFill =
        gateOccupiedFill(OCCUPIED_CELLS, isBelowGridZoom(zoom)).length > 0;
      const hasMarkers =
        mobileAggregationUnit.aggregationUnitForZoom(zoom) !== null;
      expect(hasFill && hasMarkers).toBe(false);
      // 채움 층도 빈 구간을 만들지 않는다 — 마커가 없으면 채움이 있다
      expect(hasFill || hasMarkers).toBe(true);
    }
  });

  it("zoom 16 이상(격자 줌)에서는 점령 채움이 걷히지 않는다 — 게이트 회귀 고정 (L3 확장)", () => {
    for (let zoom = GRID_MIN_ZOOM; zoom <= 21; zoom++) {
      expect(gateOccupiedFill(OCCUPIED_CELLS, isBelowGridZoom(zoom))).toEqual(
        OCCUPIED_CELLS,
      );
    }
  });

  it("테마 층(테마·교집합·경로)은 저줌에서도 남는다 — 칩 활성 화면의 데이터 표시가 목적 (L3 확장 예외, 웹 MSG-403 AC 7)", () => {
    expect(isZoomGatedLayer("occupied")).toBe(true);
    for (const layer of ["theme", "hatch", "route"] as const) {
      expect(isZoomGatedLayer(layer)).toBe(false);
    }
  });
});

describe("줌 하한 — 시(SIDO) 구간의 가장 좁은 끝 (L6, MSG-574)", () => {
  it("MAP_MIN_ZOOM이 축척 16km 단(=9)이고 그 줌의 단위가 SIDO다 — 하한에서 시 마커가 보인다", () => {
    expect(mobileAggregationUnit.MAP_MIN_ZOOM).toBe(MAP_SCALE_16KM_ZOOM);
    expect(mobileAggregationUnit.MAP_MIN_ZOOM).toBe(9);
    expect(
      mobileAggregationUnit.aggregationUnitForZoom(
        mobileAggregationUnit.MAP_MIN_ZOOM,
      ),
    ).toBe("SIDO");
  });

  it("하한 바로 위(10)는 SIGUNGU다 — 8km 단 이하 구간의 동작은 MSG-428 그대로", () => {
    expect(
      mobileAggregationUnit.aggregationUnitForZoom(
        mobileAggregationUnit.MAP_MIN_ZOOM + 1,
      ),
    ).toBe("SIGUNGU");
  });
});
