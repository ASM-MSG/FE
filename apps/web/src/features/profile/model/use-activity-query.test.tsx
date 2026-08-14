import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useActivityQuery } from "./use-activity-query";

const SUMMARY = {
  totalGridCount: 101,
  totalVideoCount: 103,
  visitedRegionCount: 2,
  currentStreak: 3,
  maxStreak: 5,
  badgeCount: 8,
};

const regionStat = (collectedCount: number, totalCount: number) => ({
  regionCode: `r${collectedCount}${totalCount}`,
  regionName: "부산광역시 부산진구 부전2동",
  parentCode: "26230",
  collectedCount,
  totalCount,
  progressRate: (collectedCount / totalCount) * 100,
  updatedAt: "2026-08-10T15:07:08Z",
});

/** 요약·행정동 통계 2계열을 pathname으로 갈라 응답한다 */
const stubActivityApis = () =>
  stubFetch(async (request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/regions/stats")
      return envelopeResponse([regionStat(1, 100), regionStat(2, 100)]);
    return envelopeResponse(SUMMARY);
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useActivityQuery — 프로필 내 활동 (MSG-395)", () => {
  it("요약의 연속 기록과 행정동 통계 합산 수집률을 함께 준다", async () => {
    stubActivityApis();

    const { result } = renderHook(() => useActivityQuery(), { wrapper });

    await waitFor(() => expect(result.current.streakDays).toBe(3));
    expect(result.current.collectionRate).toBeCloseTo(1.5);
  });

  it("조회가 끝나기 전에는 값을 만들지 않는다 — 카드가 0을 잠깐 보여주지 않게 (경계)", async () => {
    stubFetch(() => new Promise<Response>(() => {}));

    const { result } = renderHook(() => useActivityQuery(), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.streakDays).toBeNull();
    expect(result.current.collectionRate).toBeNull();
  });
});
