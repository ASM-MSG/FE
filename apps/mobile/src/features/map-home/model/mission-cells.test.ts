import { describe, expect, it } from "vitest";
import { cellIndexAt } from "../../../entities/cell/model/grid";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";
import { classifyCells, toMissionCells } from "./mission-cells";

/**
 * D9: 지도에 미션 영역이 테마 색 격자 타일로 표시되고, 내 점령과 겹치는 칸에는 테마 색
 * 대각 빗금이 얹힌다 (MSG-427). 구 `theme-cells.classifyCells`의 3분류를 계승하되
 * 입력이 목 셀에서 **서버 격자 id**로 바뀌었다.
 */
const GRID_IDS = ["16858_11420", "16882_11434", "16736_11276"];

const mobileCellOf = (gridId: string) =>
  cellIndexAt(cellCenterAt(decodeGridIndex(gridId)));

describe("서버 격자 id → 모바일 격자 셀 (D9)", () => {
  it("격자 id를 5179 셀 중심으로 디코드해 모바일 격자 인덱스로 스냅한다", () => {
    expect(toMissionCells(GRID_IDS)).toEqual(GRID_IDS.map(mobileCellOf));
  });

  it("같은 모바일 셀로 접히는 입력은 첫 건만 남긴다 (폴리곤 중복 렌더 방지)", () => {
    expect(toMissionCells([...GRID_IDS, ...GRID_IDS])).toHaveLength(
      GRID_IDS.length,
    );
  });
});

describe("미션 셀 ∩ 내 점령 셀 3분류 (D9)", () => {
  it("교집합은 빗금 대상이고 다른 두 목록에 중복되지 않는다", () => {
    const themeCells = [
      { col: 1, row: 1 },
      { col: 2, row: 2 },
    ];
    const occupiedCells = [
      { col: 2, row: 2 },
      { col: 3, row: 3 },
    ];

    expect(classifyCells(themeCells, occupiedCells)).toEqual({
      themeOnly: [{ col: 1, row: 1 }],
      occupiedOnly: [{ col: 3, row: 3 }],
      both: [{ col: 2, row: 2 }],
    });
  });

  it("점령이 없으면 전부 테마 전용이고 빗금이 없다", () => {
    const themeCells = [{ col: 1, row: 1 }];

    expect(classifyCells(themeCells, [])).toEqual({
      themeOnly: themeCells,
      occupiedOnly: [],
      both: [],
    });
  });
});
