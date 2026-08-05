import { describe, expect, it } from "vitest";
import { BADGE_GRID_COLUMNS, chunkIntoRows } from "./badge-grid";
import { MOCK_BADGES } from "./mock-badges";

describe("AC 2 그리드 행 분할 (badge-grid)", () => {
  it("뱃지 6종을 3개씩 2행으로 나눈다", () => {
    const rows = chunkIntoRows(MOCK_BADGES, BADGE_GRID_COLUMNS);
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.length)).toEqual([3, 3]);
    // 행을 이어 붙이면 원본 순서 그대로다 — 분할이 순서를 바꾸지 않는다
    expect(rows.flat()).toEqual([...MOCK_BADGES]);
  });

  it("일반 케이스 — 7개 입력 시 [3, 3, 1]로 나눈다", () => {
    const rows = chunkIntoRows([1, 2, 3, 4, 5, 6, 7], 3);
    expect(rows).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it("빈 목록은 행 없이 빈 배열이다", () => {
    expect(chunkIntoRows([], 3)).toEqual([]);
  });

  it("그리드 열 수는 3이다 (시안 3열)", () => {
    expect(BADGE_GRID_COLUMNS).toBe(3);
  });
});
