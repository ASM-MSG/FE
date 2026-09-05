import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_VIDEO_DETAIL } from "../../../test/event-video-fixture";

/**
 * AC 10 (MSG-562 D2): 상세 조회 옵션 — 포커스·재연결 자동 재조회를 끄고(조회수 부작용),
 * 생성 키를 그대로 쓰며(뮤테이션 seed와 같은 키), select가 봉투를 벗긴다.
 * 생성 옵션이 client-config를 끌어오므로 env 스텁 후 동적 import한다 (invalidate-event-surfaces.test 선례).
 */
type Module = typeof import("./use-event-video-detail-query");
let eventVideoDetailQueryOptions: Module["eventVideoDetailQueryOptions"];
let getVideoDetailQueryKey: typeof import("../../../shared/api/query-options").getVideoDetailQueryKey;

beforeEach(async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.example.test");
  vi.resetModules();
  ({ eventVideoDetailQueryOptions } =
    await import("./use-event-video-detail-query"));
  ({ getVideoDetailQueryKey } =
    await import("../../../shared/api/query-options"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("eventVideoDetailQueryOptions — 조회수 부작용 억제 (AC 10)", () => {
  it("포커스·재연결 자동 재조회가 꺼져 있다", () => {
    const options = eventVideoDetailQueryOptions(240347);

    expect(options.refetchOnWindowFocus).toBe(false);
    expect(options.refetchOnReconnect).toBe(false);
  });

  it("생성 키를 그대로 써서 뮤테이션 seed와 같은 캐시 항목을 가리킨다", () => {
    const options = eventVideoDetailQueryOptions(240347);

    expect(options.queryKey).toEqual(
      getVideoDetailQueryKey({ path: { videoId: 240347 } }),
    );
  });

  it("select가 봉투를 벗겨 상세 DTO만 넘긴다", () => {
    const options = eventVideoDetailQueryOptions(240347);

    expect(
      options.select?.({
        developCode: 0,
        message: "ok",
        data: EVENT_VIDEO_DETAIL,
      }),
    ).toEqual(EVENT_VIDEO_DETAIL);
  });
});
