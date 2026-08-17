import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  getOccupiedAggregatesInViewportQueryKey,
  getOccupiedInViewportQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { invalidateGridQueries } from "./invalidate-grid-queries";

/** 서면 일대 bbox — 집계 캐시 키는 unit·bbox별로 갈라진다 */
const seomyeonAggregationKey = (unit: string) =>
  getOccupiedAggregatesInViewportQueryKey({
    query: { swLat: 35.15, swLng: 129.05, neLat: 35.17, neLng: 129.07, unit },
  });

describe("invalidateGridQueries — 업로드 확정·READY 격자 무효화 (AC 11)", () => {
  it("집계 쿼리가 unit·bbox와 무관하게 부분 키로 전부 무효화된다 — 업로드 후 저줌 마커 count 재조회 (AC 11)", () => {
    const queryClient = new QueryClient();
    const dongKey = seomyeonAggregationKey("DONG");
    const sidoKey = getOccupiedAggregatesInViewportQueryKey({
      query: {
        swLat: 33.0,
        swLng: 125.0,
        neLat: 38.0,
        neLng: 130.0,
        unit: "SIDO",
      },
    });
    queryClient.setQueryData(dongKey, { items: [] });
    queryClient.setQueryData(sidoKey, { items: [] });

    invalidateGridQueries(queryClient, "16858_11420");

    expect(queryClient.getQueryState(dongKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(sidoKey)?.isInvalidated).toBe(true);
  });

  it("점령 격자 쿼리(기존 부분 키 무효화)는 그대로 유지된다 — 보존 단정 (AC 11 회귀 가드)", () => {
    const queryClient = new QueryClient();
    const occupiedKey = getOccupiedInViewportQueryKey({
      query: { swLat: 35.15, swLng: 129.05, neLat: 35.17, neLng: 129.07 },
    });
    queryClient.setQueryData(occupiedKey, { grids: [] });

    invalidateGridQueries(queryClient, "16858_11420");

    expect(queryClient.getQueryState(occupiedKey)?.isInvalidated).toBe(true);
  });

  it("격자와 무관한 캐시는 무효화되지 않는다 (AC 11 — 과잉 무효화 방지)", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["unrelated"], { ok: true });

    invalidateGridQueries(queryClient, "16858_11420");

    expect(queryClient.getQueryState(["unrelated"])?.isInvalidated).toBe(false);
  });
});
