import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 삭제·공개전환 후 캐시 처리 계약 (MSG-431 L6·L7).
 * 무효화 배선을 훅에서 분리한 이유는 RN 렌더 테스트 인프라가 없기 때문이다(vitest.config 정책).
 *
 * 생성 키 팩토리는 client-config(=EXPO_PUBLIC_API_BASE_URL 가드)를 정적으로 끌고 오므로
 * env를 세운 뒤 동적 import한다 (invalidate-grid-queries.test 관례).
 */
type QueryOptionsModule = typeof import("../../../shared/api/query-options");
type InvalidateModule = typeof import("./invalidate-video-queries");

let keys: QueryOptionsModule;
let invalidateAfterVideoDelete: InvalidateModule["invalidateAfterVideoDelete"];
let seedPlaybackVisibility: InvalidateModule["seedPlaybackVisibility"];

const VIDEO_ID = 4102;
const GRID_ID = "16858_11420";

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
  vi.resetModules();
  keys = await import("../../../shared/api/query-options");
  ({ invalidateAfterVideoDelete, seedPlaybackVisibility } =
    await import("./invalidate-video-queries"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** 도감·격자 계열 캐시를 미리 채워 무효화 대상 판정을 관찰 가능하게 만든다 */
const seedCaches = (queryClient: QueryClient) => {
  const entries = {
    summary: keys.getSummaryQueryKey(),
    collectionGrids: keys.getCollectionGridsQueryKey(),
    uploadHistory: keys.getUploadHistoryQueryKey(),
    // 파라미터별로 키가 갈리는 두 쿼리 — 다른 파라미터도 함께 무효화돼야 한다
    regionVideos: keys.getRegionVideosQueryKey({
      query: { regionCode: "2647010100" },
    }),
    statByPoint: keys.getStatByPointQueryKey({
      query: { lat: 35.1578, lng: 129.0594 },
    }),
    cell: keys.getCellQueryKey({ path: { gridId: GRID_ID } }),
    gridVideos: keys.getGridVideosQueryKey({ path: { gridId: GRID_ID } }),
  };
  for (const key of Object.values(entries)) {
    queryClient.setQueryData(key, { ok: true });
  }
  return entries;
};

describe("invalidateAfterVideoDelete — 삭제 성공 후 무효화 집합 (L6)", () => {
  it("도감 요약·수집 격자·잔디 이력이 무효화된다 (L6)", () => {
    const queryClient = new QueryClient();
    const entries = seedCaches(queryClient);

    invalidateAfterVideoDelete(queryClient, {
      videoId: VIDEO_ID,
      gridId: GRID_ID,
    });

    expect(queryClient.getQueryState(entries.summary)?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(entries.collectionGrids)?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(entries.uploadHistory)?.isInvalidated,
    ).toBe(true);
  });

  it("동 영상 목록·행정동 수집률이 파라미터와 무관하게 부분 키로 무효화된다 (L6)", () => {
    const queryClient = new QueryClient();
    const entries = seedCaches(queryClient);

    invalidateAfterVideoDelete(queryClient, {
      videoId: VIDEO_ID,
      gridId: GRID_ID,
    });

    expect(queryClient.getQueryState(entries.regionVideos)?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(entries.statByPoint)?.isInvalidated).toBe(
      true,
    );
  });

  it("격자 계열 쿼리 세트가 invalidateGridQueries로 함께 무효화된다 (L6)", () => {
    const queryClient = new QueryClient();
    const entries = seedCaches(queryClient);

    invalidateAfterVideoDelete(queryClient, {
      videoId: VIDEO_ID,
      gridId: GRID_ID,
    });

    expect(queryClient.getQueryState(entries.cell)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(entries.gridVideos)?.isInvalidated).toBe(
      true,
    );
  });

  it("삭제된 영상의 playback 캐시는 무효화가 아니라 제거된다 — 재조회는 404다 (L6)", () => {
    const queryClient = new QueryClient();
    const playbackKey = keys.getPlaybackQueryKey({
      path: { videoId: VIDEO_ID },
    });
    queryClient.setQueryData(playbackKey, { data: { visibility: "PUBLIC" } });

    invalidateAfterVideoDelete(queryClient, {
      videoId: VIDEO_ID,
      gridId: GRID_ID,
    });

    expect(queryClient.getQueryData(playbackKey)).toBeUndefined();
  });

  it("영상과 무관한 캐시는 무효화되지 않는다 (L6 — 과잉 무효화 방지)", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["unrelated"], { ok: true });

    invalidateAfterVideoDelete(queryClient, {
      videoId: VIDEO_ID,
      gridId: GRID_ID,
    });

    expect(queryClient.getQueryState(["unrelated"])?.isInvalidated).toBe(false);
  });
});

describe("seedPlaybackVisibility — 공개 범위 전환 성공 후 캐시 seed (L7)", () => {
  it("응답의 visibility로 playback 캐시가 갱신된다 — 재조회 없음 (L7)", () => {
    const queryClient = new QueryClient();
    const playbackKey = keys.getPlaybackQueryKey({
      path: { videoId: VIDEO_ID },
    });
    queryClient.setQueryData(playbackKey, {
      developCode: 0,
      message: "ok",
      data: { videoId: VIDEO_ID, visibility: "PUBLIC", viewCount: 12 },
    });

    seedPlaybackVisibility(queryClient, VIDEO_ID, "PRIVATE");

    expect(queryClient.getQueryData(playbackKey)).toEqual({
      developCode: 0,
      message: "ok",
      data: { videoId: VIDEO_ID, visibility: "PRIVATE", viewCount: 12 },
    });
  });

  it("seed는 무효화하지 않는다 — 재조회가 조회수를 또 올리는 것을 막는다 (L7)", () => {
    const queryClient = new QueryClient();
    const playbackKey = keys.getPlaybackQueryKey({
      path: { videoId: VIDEO_ID },
    });
    queryClient.setQueryData(playbackKey, {
      developCode: 0,
      message: "ok",
      data: { videoId: VIDEO_ID, visibility: "PUBLIC" },
    });

    seedPlaybackVisibility(queryClient, VIDEO_ID, "PRIVATE");

    expect(queryClient.getQueryState(playbackKey)?.isInvalidated).toBe(false);
  });

  it("캐시가 없으면 아무것도 만들지 않는다 (L7 — 경계)", () => {
    const queryClient = new QueryClient();
    const playbackKey = keys.getPlaybackQueryKey({
      path: { videoId: VIDEO_ID },
    });

    seedPlaybackVisibility(queryClient, VIDEO_ID, "PRIVATE");

    expect(queryClient.getQueryData(playbackKey)).toBeUndefined();
  });
});
