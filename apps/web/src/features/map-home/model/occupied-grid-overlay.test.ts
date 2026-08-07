import { describe, expect, it } from "vitest";
import { decodeGridBounds, encodeGridId } from "@/entities/cell";
import { occupiedGridOf } from "@/test/occupied-grids";
import { toOccupiedOverlays } from "./occupied-grid-overlay";

const gridAt = (lat: number, lng: number) =>
  occupiedGridOf(encodeGridId({ lat, lng }));

const SEOMYEON = gridAt(35.1579, 129.0594);
const HAEUNDAE = gridAt(35.1631, 129.1604);
/** 남해 — 부산 행정경계 밖 (busan-boundary.test의 outside 표본과 동일 좌표) */
const OFFSHORE = gridAt(34.95, 129.0);

describe("점령 격자 응답 → 오버레이 셀 (MSG-325 기준 5)", () => {
  it("응답 gridId를 그대로 오버레이 id로 쓰고, bounds는 그 gridId의 디코드 bbox다", () => {
    const [overlay] = toOccupiedOverlays([SEOMYEON]);

    expect(overlay.id).toBe(SEOMYEON.gridId);
    expect(overlay.bounds).toEqual(decodeGridBounds(SEOMYEON.gridId));
    expect(overlay.occupied).toBe(true);
  });

  it("여러 격자를 응답 순서대로 변환한다", () => {
    expect(toOccupiedOverlays([SEOMYEON, HAEUNDAE]).map((o) => o.id)).toEqual([
      SEOMYEON.gridId,
      HAEUNDAE.gridId,
    ]);
  });

  it("셀 중심이 부산 행정경계 밖인 격자는 제외한다 (MSG-263 AC 4 규칙 유지)", () => {
    expect(toOccupiedOverlays([SEOMYEON, OFFSHORE]).map((o) => o.id)).toEqual([
      SEOMYEON.gridId,
    ]);
  });

  it("빈 응답(점령 격자 0건)은 빈 오버레이 목록이다", () => {
    expect(toOccupiedOverlays([])).toEqual([]);
  });
});
