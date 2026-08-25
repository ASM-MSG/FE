import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import {
  flattenExploreRegionPages,
  nextExploreRegionsPageParam,
  useExploreRegionsQuery,
} from "./use-explore-regions-query";

/**
 * 전체 지역 리스트 훅 (MSG-463) — 20개 커서 페이지 무한 스크롤.
 * 스텁이 커서 계약을 강제한다: 첫 페이지는 cursor 없이(빈 문자열 `cursor=`도 400 —
 * occupied-grids 실측 함정), 다음 페이지는 `cursor=nextCursor` 그대로여야 응답한다.
 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const region = (regionCode: string, regionName: string) => ({
  regionCode,
  regionName,
  gridCount: 3,
});

const PAGE_1 = {
  items: [region("2644056000", "부전제1동"), region("2644057000", "부전제2동")],
  hasNext: true,
  nextCursor: "CUR-1",
};
const PAGE_2 = {
  items: [region("2644058000", "전포제1동")],
  hasNext: false,
  nextCursor: null,
};

/** 커서 계약 강제 스텁 — 계약 밖 커서(빈 문자열 포함)는 서버처럼 400으로 거부한다 */
const stubCursorPages = () =>
  stubFetch(async (request: Request) => {
    const cursor = new URL(request.url).searchParams.get("cursor");
    if (cursor === null) return envelopeResponse(PAGE_1);
    if (cursor === "CUR-1") return envelopeResponse(PAGE_2);
    return new Response("bad cursor", { status: 400 });
  });

const envelope = <T,>(data: T) => ({ developCode: 0, message: "ok", data });

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("nextExploreRegionsPageParam — 커서 파생 (AC 3)", () => {
  it("hasNext가 true면 nextCursor를 그대로 반환한다 (AC 3)", () => {
    expect(nextExploreRegionsPageParam(envelope(PAGE_1))).toBe("CUR-1");
  });

  it("hasNext가 false면 undefined로 중단한다 (AC 3)", () => {
    expect(nextExploreRegionsPageParam(envelope(PAGE_2))).toBeUndefined();
  });
});

describe("flattenExploreRegionPages — 페이지 평탄화 (AC 3)", () => {
  it("응답 순서를 보존하며 항목을 누락·중복시키지 않는다 (AC 3)", () => {
    const flattened = flattenExploreRegionPages([
      envelope(PAGE_1),
      envelope(PAGE_2),
    ]);

    expect(flattened.map((r) => r.regionName)).toEqual([
      "부전제1동",
      "부전제2동",
      "전포제1동",
    ]);
  });

  it("페이지 미도착(undefined)이면 빈 배열이다 (경계)", () => {
    expect(flattenExploreRegionPages(undefined)).toEqual([]);
  });
});

describe("useExploreRegionsQuery — 무한 스크롤 이어받기 (AC 1·2·4·6·8)", () => {
  it("비로그인에서도 조회한다 — MSG-454로 익명 조회 허용, 첫 요청은 cursor 없이 (AC 1·8)", async () => {
    const received = stubCursorPages();
    signOutForTest();

    const { result } = renderHook(() => useExploreRegionsQuery(), { wrapper });

    // 스텁이 커서 계약을 강제한다 — cursor가 실렸다면 400이라 도착하지 못한다
    await waitFor(() =>
      expect(result.current.regions?.map((r) => r.regionName)).toEqual([
        "부전제1동",
        "부전제2동",
      ]),
    );
    expect(received).toHaveLength(1);
    expect(result.current.hasNext).toBe(true);
  });

  it("loadMore가 cursor=nextCursor로 다음 20개를 요청해 기존 목록 뒤에 이어 붙인다 (AC 2)", async () => {
    stubCursorPages();

    const { result } = renderHook(() => useExploreRegionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.regions).toHaveLength(2));

    act(() => result.current.loadMore());

    await waitFor(() =>
      expect(result.current.regions?.map((r) => r.regionName)).toEqual([
        "부전제1동",
        "부전제2동",
        "전포제1동",
      ]),
    );
  });

  it("마지막 페이지(hasNext=false) 도달 후에는 loadMore를 반복해도 추가 요청이 없다 (AC 4)", async () => {
    const received = stubCursorPages();

    const { result } = renderHook(() => useExploreRegionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.regions).toHaveLength(2));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.regions).toHaveLength(3));

    act(() => result.current.loadMore());

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.hasNext).toBe(false);
    expect(received).toHaveLength(2);
  });

  it("다음 페이지 실패 시 받은 목록은 유지된 채 loadMoreFailed가 되고, 재시도로 이어받기가 재개된다 (AC 6)", async () => {
    let failNext = true;
    stubFetch(async (request: Request) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      if (cursor === null) return envelopeResponse(PAGE_1);
      if (failNext) {
        failNext = false;
        return new Response("boom", { status: 500 });
      }
      return envelopeResponse(PAGE_2);
    });

    const { result } = renderHook(() => useExploreRegionsQuery(), { wrapper });
    await waitFor(() => expect(result.current.regions).toHaveLength(2));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.loadMoreFailed).toBe(true));
    // 이미 받은 목록은 사라지지 않고, 전체 실패(isError)로 승격되지도 않는다
    expect(result.current.regions).toHaveLength(2);
    expect(result.current.isError).toBe(false);

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.regions).toHaveLength(3));
    expect(result.current.loadMoreFailed).toBe(false);
  });
});
