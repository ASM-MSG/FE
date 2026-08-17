import { describe, expect, it } from "vitest";
import type { Bounds } from "@/entities/cell";
import {
  AGGREGATION_SPAN_CAP_DEG,
  aggregationUnitForZoom,
  clampBoundsToSpan,
  drillInZoomForUnit,
} from "./aggregation-unit";
import { GRID_MIN_ZOOM } from "./grid-overlay";
import {
  MAP_SCALE_1KM_ZOOM,
  MAP_SCALE_4KM_ZOOM,
  MAP_SCALE_500M_ZOOM,
  MAP_SCALE_8KM_ZOOM,
  MIN_ZOOM,
} from "./map-scale";

describe("aggregationUnitForZoom — 줌→집계 단위 매핑 (AC 1, 축척 표 역산)", () => {
  it("zoom ≥ GRID_MIN_ZOOM이면 null이다 — 개별 격자 구간 (AC 1)", () => {
    expect(aggregationUnitForZoom(GRID_MIN_ZOOM)).toBeNull();
    expect(aggregationUnitForZoom(GRID_MIN_ZOOM + 3)).toBeNull();
  });

  it("축척 250m·500m 단이면 DONG이다 (AC 1)", () => {
    expect(aggregationUnitForZoom(GRID_MIN_ZOOM - 1)).toBe("DONG");
    expect(aggregationUnitForZoom(MAP_SCALE_500M_ZOOM)).toBe("DONG");
  });

  it("축척 1km~8km 단이면 SIGUNGU다 (AC 1)", () => {
    expect(aggregationUnitForZoom(MAP_SCALE_1KM_ZOOM)).toBe("SIGUNGU");
    expect(aggregationUnitForZoom(MAP_SCALE_8KM_ZOOM)).toBe("SIGUNGU");
  });

  it("축척 16km~128km 단이면 SIDO다 (AC 1)", () => {
    expect(aggregationUnitForZoom(MAP_SCALE_8KM_ZOOM - 1)).toBe("SIDO");
    expect(aggregationUnitForZoom(MIN_ZOOM)).toBe("SIDO");
  });
});

describe("clampBoundsToSpan — bbox 상한 클램프 (AC 3)", () => {
  /** 서면 일대 좁은 뷰포트 — 어떤 unit 상한(최소 1.0도)보다도 작다 */
  const SEOMYEON_VIEWPORT: Bounds = {
    sw: { lat: 35.15, lng: 129.05 },
    ne: { lat: 35.17, lng: 129.07 },
  };

  it("unit별 상한은 동 1.0 / 구 4.0 / 시 10.0도다 (AC 3 — 명세 리터럴)", () => {
    expect(AGGREGATION_SPAN_CAP_DEG.DONG).toBe(1.0);
    expect(AGGREGATION_SPAN_CAP_DEG.SIGUNGU).toBe(4.0);
    expect(AGGREGATION_SPAN_CAP_DEG.SIDO).toBe(10.0);
  });

  it("상한 이내 뷰포트는 그대로 반환된다 (AC 3)", () => {
    expect(clampBoundsToSpan(SEOMYEON_VIEWPORT, 1.0)).toEqual(
      SEOMYEON_VIEWPORT,
    );
  });

  it("상한 초과 축은 중심 기준으로 상한에 맞게 잘린다 — 400(4402) 발생 경로 없음 (AC 3)", () => {
    // 부산 광역 뷰포트 — lat span 2.0 / lng span 3.0 (동 상한 1.0 초과)
    const wide: Bounds = {
      sw: { lat: 34.0, lng: 128.0 },
      ne: { lat: 36.0, lng: 131.0 },
    };

    const clamped = clampBoundsToSpan(wide, 1.0);

    expect(clamped.sw.lat).toBeCloseTo(34.5, 10);
    expect(clamped.ne.lat).toBeCloseTo(35.5, 10);
    expect(clamped.sw.lng).toBeCloseTo(129.0, 10);
    expect(clamped.ne.lng).toBeCloseTo(130.0, 10);
  });
});

describe("drillInZoomForUnit — 마커 클릭 목표 줌 (추정 3, 축척 표 역산)", () => {
  it("동 마커는 개별 격자 줌(GRID_MIN_ZOOM)으로 들어간다", () => {
    expect(drillInZoomForUnit("DONG")).toBe(GRID_MIN_ZOOM);
  });

  it("구 마커는 동 구간(500m 단)으로 들어간다", () => {
    expect(drillInZoomForUnit("SIGUNGU")).toBe(MAP_SCALE_500M_ZOOM);
  });

  it("시 마커는 구 구간(4km 단)으로 들어간다", () => {
    expect(drillInZoomForUnit("SIDO")).toBe(MAP_SCALE_4KM_ZOOM);
  });
});
