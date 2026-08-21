import {
  cellIndexAt,
  type GridCellIndex,
} from "../../../entities/cell/model/grid";
import {
  cellCenterAt,
  decodeGridIndex,
} from "../../../entities/cell/model/grid-5179";

/**
 * 미션·핫구역 격자 → 지도 오버레이 셀 + 빗금 3분류 (MSG-427 D9) — 순수 함수.
 * 지도 SDK/플랫폼에 의존하지 않는다.
 *
 * 구 `theme-cells.ts`의 `classifyCells`를 계승하되 입력이 목 셀에서 **서버 격자 id**로
 * 바뀌었다(구조 교체 — F2). 스냅 근사는 `occupied-grids.ts`와 같은 규칙이라야 교집합
 * 판정이 성립한다: 5179 셀 중심을 모바일 격자 인덱스로 접는다 (MSG-423 승인 Q2 A안).
 */

/** 서버 격자 id 목록 → 모바일 격자 셀. 같은 셀로 접히는 입력은 첫 건만 남긴다. [D9] */
export const toMissionCells = (gridIds: string[]): GridCellIndex[] => {
  const seen = new Set<string>();
  const cells: GridCellIndex[] = [];
  for (const gridId of gridIds) {
    const cell = cellIndexAt(cellCenterAt(decodeGridIndex(gridId)));
    const key = `${cell.col}:${cell.row}`;
    if (seen.has(key)) continue;
    seen.add(key);
    cells.push(cell);
  }
  return cells;
};

export interface CellClassification {
  /** 미션에만 속한 셀 — 테마 색 채움 */
  themeOnly: GridCellIndex[];
  /** 내 점령에만 속한 셀 — primary 채움 */
  occupiedOnly: GridCellIndex[];
  /** 교집합 — primary 채움 + 테마 색 대각 빗금 (D9) */
  both: GridCellIndex[];
}

const keyOf = ({ col, row }: GridCellIndex) => `${col}:${row}`;

/** 미션 셀·점령 셀 → {미션 전용, 점령 전용, 교집합}. 교집합은 다른 두 목록에 중복되지 않는다 */
export const classifyCells = (
  themeCells: GridCellIndex[],
  occupiedCells: GridCellIndex[],
): CellClassification => {
  const themeKeys = new Set(themeCells.map(keyOf));
  const occupiedKeys = new Set(occupiedCells.map(keyOf));
  return {
    themeOnly: themeCells.filter((cell) => !occupiedKeys.has(keyOf(cell))),
    occupiedOnly: occupiedCells.filter((cell) => !themeKeys.has(keyOf(cell))),
    both: themeCells.filter((cell) => occupiedKeys.has(keyOf(cell))),
  };
};
