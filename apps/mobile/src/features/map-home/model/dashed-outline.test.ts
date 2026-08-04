import { describe, expect, it } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";
import { buildDashedRectOutline } from "./dashed-outline";

/**
 * AC 2: 선택 격자 점선 강조 — SDK 폴리곤 outline이 점선을 지원하지 않고(스펙 리스크 1),
 * NaverMapPolylineOverlay(v2.9.0)는 pattern prop을 네이티브로 전달하지 않아
 * dash 세그먼트(짧은 폴리라인 목록)를 순수 함수로 직접 파생한다.
 */
const BOUNDS: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.151, lng: 129.052 },
};

describe("buildDashedRectOutline (AC 2 — 점선 테두리 세그먼트)", () => {
  it("변당 dash 개수 × 4변 개수의 2점 세그먼트를 만든다", () => {
    const segments = buildDashedRectOutline(BOUNDS, 12, 0.6);
    expect(segments).toHaveLength(48);
    for (const [a, b] of segments) {
      expect(a).not.toEqual(b);
    }
  });

  it("모든 세그먼트 점이 셀 경계 사각형 위에 있다 (축 정렬)", () => {
    const segments = buildDashedRectOutline(BOUNDS, 12, 0.6);
    for (const [a, b] of segments) {
      // 한 변 위의 세그먼트 — lat 또는 lng 중 하나는 양 끝이 같다
      expect(a.lat === b.lat || a.lng === b.lng).toBe(true);
      for (const p of [a, b]) {
        expect(p.lat).toBeGreaterThanOrEqual(BOUNDS.sw.lat);
        expect(p.lat).toBeLessThanOrEqual(BOUNDS.ne.lat);
        expect(p.lng).toBeGreaterThanOrEqual(BOUNDS.sw.lng);
        expect(p.lng).toBeLessThanOrEqual(BOUNDS.ne.lng);
      }
    }
  });

  it("첫 세그먼트는 sw 코너에서 시작하고 dash 길이는 슬롯의 dashRatio 비율이다", () => {
    const dashesPerEdge = 10;
    const dashRatio = 0.5;
    const segments = buildDashedRectOutline(BOUNDS, dashesPerEdge, dashRatio);
    const [start, end] = segments[0];
    expect(start).toEqual(BOUNDS.sw);
    const edgeLength = BOUNDS.ne.lng - BOUNDS.sw.lng;
    expect(end.lng - start.lng).toBeCloseTo(
      (edgeLength / dashesPerEdge) * dashRatio,
      12,
    );
    expect(end.lat).toBe(BOUNDS.sw.lat);
  });
});
