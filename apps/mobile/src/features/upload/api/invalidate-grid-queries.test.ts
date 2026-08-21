import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 기준 28: 확정 성공 시 격자 관련 쿼리 무효화가 발사된다.
 * 현재 모바일에는 이 키를 쓰는 쿼리가 없어 무해한 no-op이지만, 병렬 MSG-423이 붙이는
 * 점령 격자 쿼리가 바로 이 키를 쓴다 — 그때 이 호출이 자동으로 효력을 갖는다(F3·R2).
 * 그래서 여기서는 "부분 키(_id) 매칭이 뷰포트 파라미터와 무관하게 걸리는가"를 고정한다.
 *
 * 생성 키 팩토리는 client-config(=EXPO_PUBLIC_API_BASE_URL 가드)를 정적으로 끌고 오므로
 * env를 세운 뒤 동적 import한다 (error-interceptor.test 관례).
 */
type QueryOptionsModule = typeof import("../../../shared/api/query-options");
type InvalidateModule = typeof import("./invalidate-grid-queries");

let keys: QueryOptionsModule;
let invalidateGridQueries: InvalidateModule["invalidateGridQueries"];

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
  vi.resetModules();
  keys = await import("../../../shared/api/query-options");
  ({ invalidateGridQueries } = await import("./invalidate-grid-queries"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const viewportKey = (bbox: {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}) => keys.getOccupiedInViewportQueryKey({ query: bbox });

describe("invalidateGridQueries — 업로드 확정 후 격자 무효화 (기준 28)", () => {
  it("점령 격자 쿼리가 뷰포트 파라미터와 무관하게 부분 키로 전부 무효화된다 (기준 28)", () => {
    const queryClient = new QueryClient();
    const seomyeon = viewportKey({
      swLat: 35.15,
      swLng: 129.05,
      neLat: 35.17,
      neLng: 129.07,
    });
    const other = viewportKey({
      swLat: 37,
      swLng: 127,
      neLat: 37.1,
      neLng: 127.1,
    });
    queryClient.setQueryData(seomyeon, { grids: [] });
    queryClient.setQueryData(other, { grids: [] });

    invalidateGridQueries(queryClient, "16858_11420");

    expect(queryClient.getQueryState(seomyeon)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(other)?.isInvalidated).toBe(true);
  });

  it("저줌 집계 마커도 unit·bbox와 무관하게 무효화된다 (기준 28)", () => {
    const queryClient = new QueryClient();
    const dong = keys.getOccupiedAggregatesInViewportQueryKey({
      query: {
        swLat: 35.15,
        swLng: 129.05,
        neLat: 35.17,
        neLng: 129.07,
        unit: "DONG",
      },
    });
    queryClient.setQueryData(dong, { items: [] });

    invalidateGridQueries(queryClient, "16858_11420");

    expect(queryClient.getQueryState(dong)?.isInvalidated).toBe(true);
  });

  it("업로드한 격자의 상세·영상 목록 2종·통계가 gridId로 무효화된다 (기준 28)", () => {
    const queryClient = new QueryClient();
    const path = { path: { gridId: "16858_11420" } };
    // 기준 문구가 "격자 영상"을 명시한다 — 상세만 보던 단정을 4종 전부로 넓혔다(검증 지적 7)
    const gridKeys = [
      keys.getCellQueryKey(path),
      keys.getGridGlobalVideosQueryKey(path),
      keys.getGridVideosQueryKey(path),
      keys.getStatByGridQueryKey({ query: { gridId: "16858_11420" } }),
    ];
    for (const key of gridKeys) queryClient.setQueryData(key, { ok: true });

    invalidateGridQueries(queryClient, "16858_11420");

    for (const key of gridKeys) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
    }
  });

  it("업로드 잔디 이력도 함께 무효화된다 — 오늘 셀 카운트가 늘었다 (기준 28)", () => {
    const queryClient = new QueryClient();
    const history = keys.getUploadHistoryQueryKey();
    queryClient.setQueryData(history, { days: [] });

    invalidateGridQueries(queryClient, "16858_11420");

    expect(queryClient.getQueryState(history)?.isInvalidated).toBe(true);
  });

  it("격자와 무관한 캐시는 무효화되지 않는다 (기준 28 — 과잉 무효화 방지)", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["unrelated"], { ok: true });

    invalidateGridQueries(queryClient, "16858_11420");

    expect(queryClient.getQueryState(["unrelated"])?.isInvalidated).toBe(false);
  });
});
