import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  ApiResponseDtoRegionExplorePageResponseDto,
  RegionGridCountResponseDto,
} from "../../../shared/api/sdk";
import {
  autoLoadMoreEnabled,
  exploreRegionsResult,
  flattenExploreRegionPages,
  nextExploreRegionsPageParam,
} from "./explore-regions-query";

/**
 * MSG-571 AC 7·8: 전체 지역 커서 파생·평탄화가 웹 원본(`use-explore-regions-query.ts`)과
 * 동등하고, 쿼리 표면 → 시트 재료 파생이 "첫 페이지 실패만 전면 실패"·"실패 후 자동
 * 이어받기 금지" 규칙을 지킨다 (location-videos-query.parity 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/region/model/use-explore-regions-query.ts",
  import.meta.url,
).pathname;

// 웹 원본이 생성 쿼리 옵션(→ client-config)을 정적 import한다 — baseUrl 부트 가드 선행
beforeAll(() => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
});
afterAll(() => {
  vi.unstubAllEnvs();
});

const loadWeb = (): Promise<{
  nextExploreRegionsPageParam: typeof nextExploreRegionsPageParam;
  flattenExploreRegionPages: typeof flattenExploreRegionPages;
}> => import(WEB_PATH);

const region = (code: string, name: string): RegionGridCountResponseDto => ({
  regionCode: code,
  regionName: name,
  gridCount: 3,
});

const page = (
  items: RegionGridCountResponseDto[],
  hasNext: boolean,
  nextCursor: string | null,
): ApiResponseDtoRegionExplorePageResponseDto => ({
  developCode: 200,
  message: "OK",
  data: { items, hasNext, nextCursor },
});

const PAGE_1 = page([region("2623053000", "부전2동")], true, "cursor-2");
const PAGE_2 = page([region("2623051000", "부전1동")], false, null);

describe("nextExploreRegionsPageParam 웹 원본 동등성 (AC 7)", () => {
  it("hasNext면 서버 커서를, 아니면 undefined를 낸다", async () => {
    const web = await loadWeb();

    for (const input of [PAGE_1, PAGE_2, page([], true, null)]) {
      expect(nextExploreRegionsPageParam(input)).toBe(
        web.nextExploreRegionsPageParam(input),
      );
    }
    expect(nextExploreRegionsPageParam(PAGE_1)).toBe("cursor-2");
    expect(nextExploreRegionsPageParam(PAGE_2)).toBeUndefined();
  });
});

describe("flattenExploreRegionPages 웹 원본 동등성 (AC 7)", () => {
  it("수집한 페이지를 응답 순서대로 이어붙인다 — 정렬·중복 제거 없음 (AC 6)", async () => {
    const web = await loadWeb();
    const dup = page([region("2623053000", "부전2동")], false, null);

    expect(flattenExploreRegionPages([PAGE_1, PAGE_2, dup])).toEqual(
      web.flattenExploreRegionPages([PAGE_1, PAGE_2, dup]),
    );
    expect(
      flattenExploreRegionPages([PAGE_1, PAGE_2, dup]).map((r) => r.regionCode),
    ).toEqual(["2623053000", "2623051000", "2623053000"]);
    expect(flattenExploreRegionPages(undefined)).toEqual([]);
  });
});

const surface = (
  over: Partial<Parameters<typeof exploreRegionsResult>[0]>,
) => ({
  data: undefined,
  isPending: false,
  isError: false,
  isFetchNextPageError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  ...over,
});

describe("exploreRegionsResult — 시트 재료 파생 (AC 9·10)", () => {
  it("첫 페이지 도착 전에는 regions undefined + isPending", () => {
    const result = exploreRegionsResult(surface({ isPending: true }));

    expect(result.regions).toBeUndefined();
    expect(result.isPending).toBe(true);
  });

  it("첫 페이지 실패는 전면 실패다 (AC 10)", () => {
    expect(exploreRegionsResult(surface({ isError: true })).isError).toBe(true);
  });

  it("이어받기 실패는 전면 실패로 승격하지 않고 받은 목록을 유지한다 (AC 9)", () => {
    const result = exploreRegionsResult(
      surface({
        data: { pages: [PAGE_1] },
        isError: true,
        isFetchNextPageError: true,
        hasNextPage: true,
      }),
    );

    expect(result.isError).toBe(false);
    expect(result.loadMoreFailed).toBe(true);
    expect(result.regions?.map((r) => r.regionName)).toEqual(["부전2동"]);
  });

  it("이어받기 실패 후 재시도 중에는 로더만 — 실패 안내와 동시에 그리지 않는다 (codex 재리뷰 P2)", () => {
    const result = exploreRegionsResult(
      surface({
        data: { pages: [PAGE_1] },
        isError: true,
        isFetchNextPageError: true,
        isFetchingNextPage: true,
        hasNextPage: true,
      }),
    );

    expect(result.isLoadingMore).toBe(true);
    expect(result.loadMoreFailed).toBe(false);
  });
});

describe("autoLoadMoreEnabled — 스크롤 자동 이어받기 가드 (AC 8)", () => {
  const result = (over: Partial<ReturnType<typeof exploreRegionsResult>>) => ({
    ...exploreRegionsResult(surface({ hasNextPage: true })),
    ...over,
  });

  it("다음 페이지가 있고 진행 중·실패가 아니면 자동 이어받기가 켜진다", () => {
    expect(autoLoadMoreEnabled(result({}))).toBe(true);
  });

  it("진행 중이면 스크롤로 다시 부르지 않는다", () => {
    expect(autoLoadMoreEnabled(result({ isLoadingMore: true }))).toBe(false);
  });

  it("hasNext=false면 부르지 않는다", () => {
    expect(autoLoadMoreEnabled(result({ hasNext: false }))).toBe(false);
  });

  it("이어받기 실패 상태에서는 스크롤로 부르지 않는다 — 재개는 다시 시도만", () => {
    expect(autoLoadMoreEnabled(result({ loadMoreFailed: true }))).toBe(false);
  });
});
