import { describe, expect, it } from "vitest";
import { cellIdFor, parseCellId } from "./cell-id";

describe("셀 id 인코딩 (AC 1 — 탭 좌표→셀 인덱스→셀 id 매핑)", () => {
  it('인덱스를 "cell-{col}-{row}"로 인코딩한다', () => {
    expect(cellIdFor({ col: 2412, row: 1925 })).toBe("cell-2412-1925");
  });

  it("음수 인덱스(원점 남서쪽)도 왕복 인코딩·파싱된다", () => {
    const samples = [
      { col: 0, row: 0 },
      { col: 2412, row: 1925 },
      { col: -3, row: -7 },
    ];
    for (const index of samples) {
      expect(parseCellId(cellIdFor(index))).toEqual(index);
    }
  });

  it("인코딩 형식이 아닌 id는 null을 반환한다", () => {
    expect(parseCellId("seomyeon-a-14")).toBeNull();
    expect(parseCellId("cell-1.5-2")).toBeNull();
    expect(parseCellId("cell--")).toBeNull();
  });
});
