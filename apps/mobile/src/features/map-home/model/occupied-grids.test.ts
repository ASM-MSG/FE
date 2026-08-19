import { describe, expect, it } from "vitest";
import type { OccupiedGridResponseDto } from "../../../shared/api/sdk";
import { cellBoundsAt } from "../../../entities/cell/model/grid";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";
import { toOccupiedCells } from "./occupied-grids";

/**
 * L4: toOccupiedCells(grids)가 OccupiedGridResponseDto[]를 모바일 격자 인덱스 배열로
 * 바꾸고, 같은 gridId 중복은 1건으로 접으며, 빈 입력에 빈 배열을 반환한다 (MSG-423).
 *
 * 정규화 규칙(승인 Q2 A안): 서버 gridId(EPSG:5179 100m) → 5179 셀 중심 →
 * 모바일 격자 인덱스. 그래서 "결과 셀의 모바일 bounds가 그 gridId의 5179 셀 중심을
 * 품는다"가 이 함수의 관찰 가능한 계약이다 — 독립 오라클(cellBoundsAt)로 단정한다.
 */
const gridOf = (gridId: string): OccupiedGridResponseDto => {
  const { gridX, gridY } = decodeGridIndex(gridId);
  return {
    gridId,
    gridX,
    gridY,
    zoneName: "서면",
    zoneCell: "A-14",
    regionName: "부전제1동",
  };
};

/** 서버 gridId 표본 — 서면 일대(서로 다른 셀) */
const SEOMYEON = "16858_11420";
const SEOMYEON_NE = "16882_11434";
const BUSAN_SW = "16736_11276";

/**
 * **같은 모바일 셀로 스냅되는 서로 다른 5179 격자 쌍** (인접 열 gridX 11412·11413).
 * 5179 셀은 100m 정사각인데 모바일 경도 스텝(0.00115°)은 이 위도에서 약 104m라,
 * 두 체계의 경계가 어긋나는 지점에서 인접 5179 셀 둘이 한 모바일 셀에 들어간다 —
 * 승인 Q2 A안이 감수한 근사의 직접적 귀결이다(스펙 R2).
 * 표본은 서면 일대 gridX·gridY 격자를 훑어 실제 충돌을 찾아 고정했다.
 */
const COLLIDING_A = "16850_11412";
const COLLIDING_B = "16850_11413";

describe("toOccupiedCells — 점령 격자 응답 → 모바일 격자 인덱스 (L4)", () => {
  it("빈 입력에 빈 배열을 반환한다", () => {
    expect(toOccupiedCells([])).toEqual([]);
  });

  it("격자마다 모바일 인덱스 1건을 만들고, 그 셀 bounds가 서버 격자의 5179 중심을 품는다", () => {
    const grids = [gridOf(SEOMYEON), gridOf(SEOMYEON_NE), gridOf(BUSAN_SW)];

    const cells = toOccupiedCells(grids);

    expect(cells).toHaveLength(3);
    grids.forEach((grid, i) => {
      const center = cellCenterAt(decodeGridIndex(grid.gridId));
      const bounds = cellBoundsAt(cells[i]);
      expect(center.lat).toBeGreaterThanOrEqual(bounds.sw.lat);
      expect(center.lat).toBeLessThan(bounds.ne.lat);
      expect(center.lng).toBeGreaterThanOrEqual(bounds.sw.lng);
      expect(center.lng).toBeLessThan(bounds.ne.lng);
    });
  });

  it("같은 gridId가 여러 번 오면 1건으로 접는다", () => {
    const cells = toOccupiedCells([
      gridOf(SEOMYEON),
      gridOf(SEOMYEON),
      gridOf(SEOMYEON_NE),
    ]);

    expect(cells).toHaveLength(2);
  });

  it("서로 다른 gridId가 같은 모바일 셀로 스냅되면 1건으로 접힌다 — 폴리곤 겹침·React key 중복 방지 (codex 리뷰 P2-2)", () => {
    const cells = toOccupiedCells([
      gridOf(COLLIDING_A),
      gridOf(COLLIDING_B),
      gridOf(SEOMYEON_NE),
    ]);

    expect(cells).toHaveLength(2);
  });

  it("결과 셀 인덱스에 중복이 없다 — 지도 오버레이 key의 유일성 전제 (codex 리뷰 P2-2)", () => {
    const cells = toOccupiedCells([
      gridOf(COLLIDING_A),
      gridOf(COLLIDING_B),
      gridOf(SEOMYEON),
      gridOf(SEOMYEON),
    ]);

    const keys = cells.map(({ col, row }) => `${col}:${row}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("멀리 떨어진 격자는 서로 다른 모바일 셀로 스냅된다", () => {
    const [near, far] = toOccupiedCells([gridOf(SEOMYEON), gridOf(BUSAN_SW)]);

    expect(near).not.toEqual(far);
  });
});
