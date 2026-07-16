import { describe, expect, it } from "vitest";
import { MOCK_CELLS } from "@/entities/cell";
import { cellsQueryOptions, fetchCells } from "./use-cells-query";

describe("cells query (L7)", () => {
  it("queryKey는 API 교체와 무관한 고정 키 ['cells']다", () => {
    expect(cellsQueryOptions().queryKey).toEqual(["cells"]);
  });

  it("queryFn을 통해 격자 목록을 조회하며 반환 타입은 Cell[] 계약을 지킨다", async () => {
    const queryFn = cellsQueryOptions().queryFn;
    expect(typeof queryFn).toBe("function");

    const cells = await fetchCells();

    expect(Array.isArray(cells)).toBe(true);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell).toMatchObject({
        id: expect.any(String),
        label: expect.any(String),
        center: { lat: expect.any(Number), lng: expect.any(Number) },
        videoCount: expect.any(Number),
      });
    }
  });

  it("현재 소스는 mock이며, queryFn 내부 교체만으로 실 API 전환이 가능하다", async () => {
    // queryFn(mock)의 결과가 mock 소스와 동일 — 실 API 전환 시 이 함수 내부만 바뀐다
    await expect(fetchCells()).resolves.toEqual(MOCK_CELLS);
  });
});
