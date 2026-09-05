import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  ApiResponseDtoEventLocationVideoPageResponseDto,
  EventLocationVideoResponseDto,
} from "../../../shared/api/sdk";
import {
  flattenLocationVideoPages,
  locationVideosResult,
  nextLocationVideosPageParam,
} from "./location-videos-query";

/**
 * AC 2·10 (D13): 커서 파생·페이지 평탄화가 웹 원본과 동등하고, 쿼리 표면 → 시트 재료 파생이
 * "첫 페이지 실패만 전면 실패"(이어받기 실패는 목록 유지) 규칙을 지킨다.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/use-location-videos-query.ts",
  import.meta.url,
).pathname;

/**
 * 웹 원본은 같은 파일에서 생성 쿼리 옵션(→ client.gen → client-config)을 정적 import한다 —
 * 동적 import 전에 baseUrl을 세우지 않으면 모듈 로드가 부트 가드로 throw한다.
 */
beforeAll(() => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
});
afterAll(() => {
  vi.unstubAllEnvs();
});

const loadWeb = (): Promise<{
  nextLocationVideosPageParam: typeof nextLocationVideosPageParam;
  flattenLocationVideoPages: typeof flattenLocationVideoPages;
}> => import(WEB_PATH);

const video = (videoId: number): EventLocationVideoResponseDto => ({
  videoId,
  thumbnailUrl: `https://img.test/${videoId}.jpg`,
  durationSec: 5,
  createdAt: "2026-09-02T11:58:00+09:00",
  helpfulCount: 1,
  commentCount: 2,
});

const page = (
  videos: EventLocationVideoResponseDto[],
  hasNext: boolean,
  nextCursor: string | null,
): ApiResponseDtoEventLocationVideoPageResponseDto => ({
  developCode: 200,
  message: "OK",
  data: { videos, hasNext, nextCursor },
});

const PAGE_1 = page([video(240347)], true, "cursor-2");
const PAGE_2 = page([video(240346)], false, null);
const LAST_PAGE = page([video(240347)], false, null);

describe("nextLocationVideosPageParam 웹 원본 동등성 (AC 2)", () => {
  it("hasNext면 서버 커서를, 아니면 undefined를 낸다", async () => {
    const web = await loadWeb();

    for (const input of [PAGE_1, PAGE_2, page([], true, null)]) {
      expect(nextLocationVideosPageParam(input)).toBe(
        web.nextLocationVideosPageParam(input),
      );
    }
    expect(nextLocationVideosPageParam(PAGE_1)).toBe("cursor-2");
    expect(nextLocationVideosPageParam(PAGE_2)).toBeUndefined();
  });
});

describe("flattenLocationVideoPages 웹 원본 동등성 (AC 2)", () => {
  it("수집한 페이지를 응답 순서대로 이어붙인다", async () => {
    const web = await loadWeb();

    expect(flattenLocationVideoPages([PAGE_1, PAGE_2])).toEqual(
      web.flattenLocationVideoPages([PAGE_1, PAGE_2]),
    );
    expect(
      flattenLocationVideoPages([PAGE_1, PAGE_2]).map((v) => v.videoId),
    ).toEqual([240347, 240346]);
    expect(flattenLocationVideoPages(undefined)).toEqual([]);
  });
});

const surface = (
  over: Partial<Parameters<typeof locationVideosResult>[0]>,
) => ({
  data: undefined,
  isPending: false,
  isError: false,
  isFetchNextPageError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  ...over,
});

describe("locationVideosResult — 시트 재료 파생 (AC 2·10·D13)", () => {
  it("첫 페이지 도착 전에는 videos undefined + isPending (부분 렌더 없는 게이트)", () => {
    const result = locationVideosResult(surface({ isPending: true }), true);

    expect(result.videos).toBeUndefined();
    expect(result.isPending).toBe(true);
    expect(result.hasLocationVideos).toBe(false);
  });

  it("비활성(위치 미선택)은 pending으로 두지 않는다 — 게이트 쿼리는 영원히 pending이다", () => {
    expect(
      locationVideosResult(surface({ isPending: true }), false).isPending,
    ).toBe(false);
  });

  it("첫 페이지 0건은 실패가 아니라 빈 위치다 (AC 3)", () => {
    const result = locationVideosResult(
      surface({ data: { pages: [page([], false, null)] } }),
      true,
    );

    expect(result.videos).toEqual([]);
    expect(result.hasLocationVideos).toBe(false);
    expect(result.isError).toBe(false);
  });

  it("첫 페이지 실패는 전면 실패다 (AC 10)", () => {
    expect(locationVideosResult(surface({ isError: true }), true).isError).toBe(
      true,
    );
  });

  it("이어받기 실패는 전면 실패로 승격하지 않는다 — 받은 목록을 유지한다 (AC 10)", () => {
    const result = locationVideosResult(
      surface({
        data: { pages: [PAGE_1] },
        isError: true,
        isFetchNextPageError: true,
        hasNextPage: true,
      }),
      true,
    );

    expect(result.isError).toBe(false);
    expect(result.videos?.map((v) => v.videoId)).toEqual([240347]);
    expect(result.hasNext).toBe(true);
  });

  it("hasNext:false면 더 보기가 없다 (AC 2)", () => {
    const result = locationVideosResult(
      surface({ data: { pages: [LAST_PAGE] }, hasNextPage: false }),
      true,
    );

    expect(result.hasNext).toBe(false);
    expect(result.hasLocationVideos).toBe(true);
  });
});
