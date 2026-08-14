import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "@/entities/cell";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useHotRegionSummary } from "./use-hot-region-summary";

const VIEWPORT: Bounds = {
  sw: { lat: 35.15, lng: 129.05 },
  ne: { lat: 35.16, lng: 129.06 },
};

const hotZone = (gridId: string, score: number, regionName: string) => ({
  gridId,
  gridY: 0,
  gridX: 0,
  score,
  zoneName: "부전",
  zoneCell: "B-07",
  regionName,
});

const globalVideo = (videoId: number) => ({
  videoId,
  thumbnailUrl: `https://cdn.test/${videoId}.jpg`,
  durationSec: 20,
  viewCount: 700,
  recordedAt: "2026-08-10T10:00:00Z",
  nickname: "busan.vlog",
});

/** 핫구역·격자 영상·내 수집 영상 3계열을 pathname으로 갈라 응답한다 */
const stubSummaryApis = (zones: ReturnType<typeof hotZone>[]) =>
  stubFetch(async (request) => {
    const { pathname } = new URL(request.url);
    if (pathname.includes("hotzones"))
      return envelopeResponse({ hotZones: zones });
    if (pathname.includes("/collections/videos")) return envelopeResponse([]);
    return envelopeResponse({ videos: [globalVideo(1)], hasNext: false });
  });

/** 에러 경로는 재시도 백오프를 타면 타임아웃한다 — retry:false 클라이언트 */
const noRetryWrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

beforeEach(signInForTest);

afterEach(() => {
  vi.unstubAllGlobals();
  signOutForTest();
});

describe("useHotRegionSummary — 현재 행정동의 핫구역 요약 (AC 8~10)", () => {
  it("다른 행정동의 핫구역은 요약에서 제외한다 (AC 8)", async () => {
    stubSummaryApis([
      hotZone("16858_11420", 9, "부전동"),
      hotZone("16859_11420", 5, "전포동"),
      hotZone("16860_11421", 3, "부전동"),
    ]);

    const { result } = renderHook(
      () =>
        useHotRegionSummary({
          bounds: VIEWPORT,
          regionName: "부전동",
          regionCode: "2635058",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.hotGridIds).toHaveLength(2));
    expect(result.current.hotGridIds).toEqual(["16858_11420", "16860_11421"]);
  });

  it("표본 격자의 영상을 합쳐 스탯을 만든다 (AC 9)", async () => {
    stubSummaryApis([hotZone("16858_11420", 9, "부전동")]);

    const { result } = renderHook(
      () =>
        useHotRegionSummary({
          bounds: VIEWPORT,
          regionName: "부전동",
          regionCode: "2635058",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.videos).toHaveLength(1));
    expect(result.current.stats.videoCount).toBe(1);
    expect(result.current.stats.viewCount).toBe(700);
  });

  it("행정동이 아직 정해지지 않았으면 빈 요약이다 (경계)", async () => {
    stubSummaryApis([hotZone("16858_11420", 9, "부전동")]);

    const { result } = renderHook(
      () =>
        useHotRegionSummary({
          bounds: VIEWPORT,
          regionName: null,
          regionCode: null,
        }),
      { wrapper },
    );

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.hotGridIds).toEqual([]);
    expect(result.current.videos).toEqual([]);
  });
});

describe("useHotRegionSummary — 핫구역 조회 실패 (codex 리뷰 반영)", () => {
  it("핫구역 요청이 실패하면 빈 상태가 아니라 실패로 알린다", async () => {
    stubFetch(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname.includes("hotzones"))
        return new Response(null, { status: 500 });
      return envelopeResponse([]);
    });

    const { result } = renderHook(
      () =>
        useHotRegionSummary({
          bounds: VIEWPORT,
          regionName: "부전동",
          regionCode: "2635058",
        }),
      { wrapper: noRetryWrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.videos).toEqual([]);
  });
});

describe("useHotRegionSummary — 참조 안정성 (리뷰 반영)", () => {
  it("데이터가 그대로면 리렌더에도 cells·hotGridIds가 같은 배열이다 — 오버레이 재게시 방지", async () => {
    stubSummaryApis([hotZone("16858_11420", 9, "부전동")]);

    const { result, rerender } = renderHook(
      () =>
        useHotRegionSummary({
          bounds: VIEWPORT,
          regionName: "부전동",
          regionCode: "2635058",
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.cells).toHaveLength(1));
    const cells = result.current.cells;
    const hotGridIds = result.current.hotGridIds;

    rerender();

    expect(result.current.cells).toBe(cells);
    expect(result.current.hotGridIds).toBe(hotGridIds);
  });
});
