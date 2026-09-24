import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 차단·해제 성공 후 무효화 집합 (MSG-570 기준 6).
 * 목록형 4종은 활성 재조회, 단건 조회 2종(`getPlayback`·`getVideoDetail`)은 무효화만 하고
 * 재조회하지 않는다(조회수 부작용 · 재생 화면 pop 전 404 플래시 방지).
 * 생성 키 팩토리는 client-config를 정적으로 끌고 오므로 env를 세운 뒤 동적 import한다.
 */
type QueryOptionsModule = typeof import("../../../shared/api/query-options");
type InvalidateModule = typeof import("./invalidate-blocked-content");

let keys: QueryOptionsModule;
let invalidateAfterBlockChange: InvalidateModule["invalidateAfterBlockChange"];

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
  vi.resetModules();
  keys = await import("../../../shared/api/query-options");
  ({ invalidateAfterBlockChange } =
    await import("./invalidate-blocked-content"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/**
 * 활성 관찰자가 붙은 캐시를 만든다 — 무효화가 "재조회까지 하는지"는 관찰자가 있어야 보인다.
 * staleTime Infinity라 관찰자 구독 자체는 재조회를 일으키지 않는다.
 */
const observe = async (
  queryClient: QueryClient,
  queryKey: readonly unknown[],
) => {
  const options = {
    queryKey,
    queryFn: async () => ({ ok: true }),
    staleTime: Infinity,
  };
  await queryClient.fetchQuery(options);
  return new QueryObserver(queryClient, options).subscribe(() => {});
};

const seedKeys = () => ({
  gridGlobalVideos: keys.getGridGlobalVideosQueryKey({
    path: { gridId: "16858_11420" },
  }),
  locationVideos: keys.getLocationVideosInfiniteQueryKey({
    path: { occurrenceId: 5, locationId: 11 },
  }),
  missionVideos: keys.getMissionVideosQueryKey({ path: { missionId: 3 } }),
  comments: keys.getCommentsQueryKey({
    path: { videoId: 240347 },
    query: { cursor: "c1" },
  }),
  playback: keys.getPlaybackQueryKey({ path: { videoId: 4102 } }),
  videoDetail: keys.getVideoDetailQueryKey({ path: { videoId: 240347 } }),
});

describe("invalidateAfterBlockChange — 차단·해제 성공 후 무효화 집합 (기준 6)", () => {
  it("격자 전역·위치 영상(infinite)·미션 영상·댓글 페이지는 파라미터와 무관하게 무효화되고 활성 재조회된다 (기준 6)", async () => {
    const queryClient = new QueryClient();
    const entries = seedKeys();
    const unsubscribes = await Promise.all(
      [
        entries.gridGlobalVideos,
        entries.locationVideos,
        entries.missionVideos,
        entries.comments,
      ].map((key) => observe(queryClient, key)),
    );

    invalidateAfterBlockChange(queryClient);

    for (const key of [
      entries.gridGlobalVideos,
      entries.locationVideos,
      entries.missionVideos,
      entries.comments,
    ]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(key)?.fetchStatus).toBe("fetching");
    }
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    queryClient.clear();
  });

  it("재생 단건·행사 영상 상세는 무효화만 되고 활성 상태여도 재조회하지 않는다 — 조회수 부작용 (기준 6)", async () => {
    const queryClient = new QueryClient();
    const entries = seedKeys();
    const unsubscribes = await Promise.all(
      [entries.playback, entries.videoDetail].map((key) =>
        observe(queryClient, key),
      ),
    );

    invalidateAfterBlockChange(queryClient);

    for (const key of [entries.playback, entries.videoDetail]) {
      expect(queryClient.getQueryState(key)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(key)?.fetchStatus).toBe("idle");
    }
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    queryClient.clear();
  });

  it("차단과 무관한 캐시(차단 목록 포함)는 무효화되지 않는다 (기준 6·14 — 과잉 무효화 방지)", () => {
    const queryClient = new QueryClient();
    const blockedUsers = keys.getBlockedUsersQueryKey();
    queryClient.setQueryData(blockedUsers, { ok: true });
    queryClient.setQueryData(["unrelated"], { ok: true });

    invalidateAfterBlockChange(queryClient);

    expect(queryClient.getQueryState(blockedUsers)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(["unrelated"])?.isInvalidated).toBe(false);
  });
});
