/**
 * 테마 셀 ∩ 내 점령 셀 3분류 (MSG-298 AC 8) — 순수 모델.
 * 지도 렌더는 결과를 그대로 쓴다: 점령 전용·교집합 = primary 채움(교집합은 빗금 추가),
 * 테마 전용 = 테마 색 채움.
 */
import type { GridCellIndex } from "../../../entities/cell/model/grid";

export interface CellClassification {
  /** 테마에만 속한 셀 — 테마 색 채움 (AC 7) */
  themeOnly: GridCellIndex[];
  /** 내 점령에만 속한 셀 — primary 채움 (AC 6, 확정 8) */
  occupiedOnly: GridCellIndex[];
  /** 교집합 — primary 채움 + 테마 색 빗금 (AC 9) */
  both: GridCellIndex[];
}

const keyOf = ({ col, row }: GridCellIndex) => `${col}:${row}`;

/** 테마 셀·점령 셀 목록 → {테마 전용, 점령 전용, 교집합} — 교집합은 다른 두 목록에 중복되지 않는다 */
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
