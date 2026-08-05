import { describe, expect, it } from "vitest";
import type { GridCellIndex } from "../../../entities/cell/model/grid";
import { classifyCells } from "./theme-cells";

const c = (col: number, row: number): GridCellIndex => ({ col, row });

/**
 * AC 8: 셀 분류 함수 — 테마 셀 목록 ∩ 점령 셀 목록 → {점령 전용, 테마 전용, 교집합}
 * 3분류가 정확하다. 교집합 셀은 다른 두 목록에 중복 포함되지 않는다.
 */
describe("AC 8 테마·점령 셀 3분류 (theme-cells)", () => {
  it("테마 전용·점령 전용·교집합으로 정확히 나눈다", () => {
    const theme = [c(0, 0), c(1, 0), c(2, 3)];
    const occupied = [c(1, 0), c(5, 5)];
    expect(classifyCells(theme, occupied)).toEqual({
      themeOnly: [c(0, 0), c(2, 3)],
      occupiedOnly: [c(5, 5)],
      both: [c(1, 0)],
    });
  });

  it("교집합 셀은 점령 전용·테마 전용 목록에 다시 나타나지 않는다", () => {
    const shared = c(3, 3);
    const { themeOnly, occupiedOnly, both } = classifyCells(
      [shared, c(4, 4)],
      [shared, c(6, 6)],
    );
    expect(both).toEqual([shared]);
    expect(themeOnly).not.toContainEqual(shared);
    expect(occupiedOnly).not.toContainEqual(shared);
  });

  it("교집합이 없으면 both는 빈 배열, 입력이 비면 세 목록 모두 빈 배열", () => {
    expect(classifyCells([c(0, 0)], [c(1, 1)])).toEqual({
      themeOnly: [c(0, 0)],
      occupiedOnly: [c(1, 1)],
      both: [],
    });
    expect(classifyCells([], [])).toEqual({
      themeOnly: [],
      occupiedOnly: [],
      both: [],
    });
  });

  it("같은 col·row 값이면 객체 참조가 달라도 같은 셀로 판정한다", () => {
    const { both } = classifyCells([{ col: 7, row: -2 }], [{ col: 7, row: -2 }]);
    expect(both).toEqual([c(7, -2)]);
  });
});
