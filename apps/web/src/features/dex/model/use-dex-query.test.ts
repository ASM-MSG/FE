import { describe, expect, it } from "vitest";
import { MOCK_DEX } from "@/entities/dex";
import { dexQueryOptions, fetchDex } from "./use-dex-query";

describe("dex query (AC 19)", () => {
  it("queryKey는 API 교체와 무관한 고정 키 ['dex']다", () => {
    expect(dexQueryOptions().queryKey).toEqual(["dex"]);
  });

  it("queryFn을 통해 도감 데이터를 조회하며 반환 타입은 DexData 계약을 지킨다", async () => {
    const queryFn = dexQueryOptions().queryFn;
    expect(typeof queryFn).toBe("function");

    const data = await fetchDex();

    expect(data.summary).toMatchObject({
      nickname: expect.any(String),
      totalLabel: expect.any(String),
      totalExploredPct: expect.any(Number),
      streakDays: expect.any(Number),
      collectedCellCount: expect.any(Number),
      badgeCount: expect.any(Number),
      regionName: expect.any(String),
      regionExploredPct: expect.any(Number),
    });
    expect(data.collectedCells.length).toBeGreaterThan(0);
    for (const cell of data.collectedCells) {
      expect(cell).toMatchObject({
        cellId: expect.any(String),
        label: expect.any(String),
        center: { lat: expect.any(Number), lng: expect.any(Number) },
        collectedAt: expect.any(String),
        videoCount: expect.any(Number),
      });
    }
  });

  it("현재 소스는 mock이며, queryFn 내부 교체만으로 실 API 전환이 가능하다", async () => {
    await expect(fetchDex()).resolves.toEqual(MOCK_DEX);
  });
});
