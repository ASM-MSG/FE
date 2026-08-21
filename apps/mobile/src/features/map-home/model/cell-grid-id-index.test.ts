import { describe, expect, it } from "vitest";
import { cellIndexAt } from "../../../entities/cell/model/grid";
import { buildCellGridIdIndex, gridIdOfCell } from "./cell-grid-id-index";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";

/**
 * C3: 탭한 모바일 격자 셀이 **서버 `gridId`** 로 해석돼 격자 상세 조회가 나간다 (MSG-427).
 * 모바일에 좌표 → 모바일 셀 인덱스 인코딩만 있고 서버 격자 체계는 5179라, 화면에 실제로
 * 올라온 격자(점령·핫구역·코스 스팟)의 gridId로 **역인덱스**를 만들어 되돌린다.
 */
const GRID_IDS = ["16858_11420", "16882_11434", "16736_11276"];

/** gridId → 그 5179 셀 중심이 속하는 모바일 격자 셀 */
const mobileCellOf = (gridId: string) =>
  cellIndexAt(cellCenterAt(decodeGridIndex(gridId)));

describe("모바일 셀 → 서버 gridId 역인덱스 (C3)", () => {
  it("역인덱스에 담긴 격자는 그 셀을 탭했을 때 원래 gridId로 되돌아온다", () => {
    const index = buildCellGridIdIndex(GRID_IDS);

    for (const gridId of GRID_IDS) {
      expect(gridIdOfCell(index, mobileCellOf(gridId))).toBe(gridId);
    }
  });

  it("역인덱스에 없는 셀은 null이다 — 상세가 열리지 않는다", () => {
    const index = buildCellGridIdIndex(GRID_IDS);

    expect(gridIdOfCell(index, { col: -999, row: -999 })).toBeNull();
  });

  it("여러 출처(점령·핫구역·코스 스팟)를 합쳐도 같은 셀은 첫 등장만 남는다", () => {
    const index = buildCellGridIdIndex([...GRID_IDS, ...GRID_IDS]);

    expect(index.size).toBe(GRID_IDS.length);
    expect(gridIdOfCell(index, mobileCellOf(GRID_IDS[0]))).toBe(GRID_IDS[0]);
  });

  it("빈 입력은 빈 인덱스다", () => {
    expect(buildCellGridIdIndex([]).size).toBe(0);
  });
});
