import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 영상 액션 mutation 3종의 요청·성공 처리·실패 계약
 * (MSG-431 L6~L8, L11). RN 렌더 인프라가 없어 훅 대신 **훅이 그대로 넘기는 옵션 객체**를
 * MutationObserver로 구동한다 (MSG-426 delete-account-mutation.test 관례).
 */

const API_BASE = "https://api.test.local";
const VIDEO_ID = 4102;
const GRID_ID = "16858_11420";

const loadModule = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const mutations = await import("./video-mutations");
  const keys = await import("../../../shared/api/query-options");
  // 실패 분기 단정은 정규화된 ApiError를 전제한다 — 앱 부트스트랩과 같은 배선을 재현한다
  const { registerApiErrorInterceptor } =
    await import("../../../shared/api/error-interceptor");
  registerApiErrorInterceptor();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return { mutations, keys, queryClient };
};

interface ReceivedRequest {
  method: string;
  pathname: string;
  body: string;
}

const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: ReceivedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      received.push({
        method: input.method,
        pathname: new URL(input.url).pathname,
        body: await input.clone().text(),
      });
      return route(input);
    }),
  );
  return received;
};

/**
 * 응답을 붙잡아 두는 fetch 스텁 — in-flight 창을 실제로 열어 연타 가드를 관찰한다.
 * `started`는 요청이 나간 시점, `release`는 응답 반환 시점을 테스트가 쥔다.
 */
const stubGatedFetch = (respond: () => Response) => {
  let release: (() => void) | undefined;
  let markStarted: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const received = stubFetch(async () => {
    markStarted?.();
    await gate;
    return respond();
  });
  return { received, started, release: () => release?.() };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("공개 범위 전환 mutation (L7·L8)", () => {
  it("선택한 공개 범위로 PATCH /api/videos/{videoId}/visibility가 발사된다 (L7)", async () => {
    const { mutations, queryClient } = await loadModule();
    const received = stubFetch(() =>
      envelopeResponse({ videoId: VIDEO_ID, visibility: "PRIVATE" }),
    );
    const observer = new MutationObserver(
      queryClient,
      mutations.setVideoVisibilityMutationOptions({ queryClient }),
    );

    await observer.mutate({ videoId: VIDEO_ID, visibility: "PRIVATE" });

    expect(received).toEqual([
      {
        method: "PATCH",
        pathname: `/api/videos/${VIDEO_ID}/visibility`,
        body: JSON.stringify({ visibility: "PRIVATE" }),
      },
    ]);
  });

  it("성공하면 응답의 visibility로 playback 캐시가 seed된다 — 재조회 없음 (L7)", async () => {
    const { mutations, keys, queryClient } = await loadModule();
    const playbackKey = keys.getPlaybackQueryKey({
      path: { videoId: VIDEO_ID },
    });
    queryClient.setQueryData(playbackKey, {
      developCode: 0,
      message: "ok",
      data: { videoId: VIDEO_ID, visibility: "PUBLIC" },
    });
    stubFetch(() =>
      envelopeResponse({ videoId: VIDEO_ID, visibility: "PRIVATE" }),
    );
    const observer = new MutationObserver(
      queryClient,
      mutations.setVideoVisibilityMutationOptions({ queryClient }),
    );

    await observer.mutate({ videoId: VIDEO_ID, visibility: "PRIVATE" });

    expect(
      queryClient.getQueryData<{ data: { visibility: string } }>(playbackKey)
        ?.data.visibility,
    ).toBe("PRIVATE");
    expect(queryClient.getQueryState(playbackKey)?.isInvalidated).toBe(false);
  });

  it("실패하면 캐시가 그대로 남고 실패 콜백이 불린다 (L7)", async () => {
    const { mutations, keys, queryClient } = await loadModule();
    const playbackKey = keys.getPlaybackQueryKey({
      path: { videoId: VIDEO_ID },
    });
    queryClient.setQueryData(playbackKey, {
      developCode: 0,
      message: "ok",
      data: { videoId: VIDEO_ID, visibility: "PUBLIC" },
    });
    stubFetch(() => errorEnvelope(9999, "전환 실패", 500));
    const onError = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      mutations.setVideoVisibilityMutationOptions({ queryClient, onError }),
    );

    await expect(
      observer.mutate({ videoId: VIDEO_ID, visibility: "PRIVATE" }),
    ).rejects.toThrow();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData<{ data: { visibility: string } }>(playbackKey)
        ?.data.visibility,
    ).toBe("PUBLIC");
  });

  it("전환이 진행 중인 동안 재발사가 무시된다 — 중복 PATCH 없음 (L8)", async () => {
    const { mutations, queryClient } = await loadModule();
    const { received, started, release } = stubGatedFetch(() =>
      envelopeResponse({ videoId: VIDEO_ID, visibility: "PRIVATE" }),
    );
    const observer = new MutationObserver(
      queryClient,
      mutations.setVideoVisibilityMutationOptions({ queryClient }),
    );
    const mutate = vi.fn();
    const guarded = mutations.guardMutate(
      queryClient,
      mutations.VIDEO_MUTATION_KEYS.setVisibility,
      mutate,
    );

    const inFlight = observer.mutate({
      videoId: VIDEO_ID,
      visibility: "PRIVATE",
    });
    await started;
    guarded({ videoId: VIDEO_ID, visibility: "PUBLIC" });

    expect(mutate).not.toHaveBeenCalled();
    expect(received).toHaveLength(1);

    release();
    await inFlight;
    guarded({ videoId: VIDEO_ID, visibility: "PUBLIC" });

    expect(mutate).toHaveBeenCalledTimes(1);
  });
});

describe("영상 삭제 mutation (L6)", () => {
  it("확인하면 DELETE /api/videos/{videoId}가 발사된다 (L6)", async () => {
    const { mutations, queryClient } = await loadModule();
    const received = stubFetch(() => envelopeResponse(null));
    const observer = new MutationObserver(
      queryClient,
      mutations.deleteVideoMutationOptions({ queryClient }),
    );

    await observer.mutate({ videoId: VIDEO_ID, gridId: GRID_ID });

    expect(
      received.map(({ method, pathname }) => ({ method, pathname })),
    ).toEqual([{ method: "DELETE", pathname: `/api/videos/${VIDEO_ID}` }]);
  });

  it("성공하면 도감 목록 캐시가 무효화되고 완료 콜백이 불린다 (L6)", async () => {
    const { mutations, keys, queryClient } = await loadModule();
    const summaryKey = keys.getSummaryQueryKey();
    queryClient.setQueryData(summaryKey, { ok: true });
    stubFetch(() => envelopeResponse(null));
    const onDeleted = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      mutations.deleteVideoMutationOptions({ queryClient, onDeleted }),
    );

    await observer.mutate({ videoId: VIDEO_ID, gridId: GRID_ID });

    expect(queryClient.getQueryState(summaryKey)?.isInvalidated).toBe(true);
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("실패하면 무효화도 완료 콜백도 없고 실패 콜백만 불린다 — 다이얼로그가 남는다 (L6)", async () => {
    const { mutations, keys, queryClient } = await loadModule();
    const summaryKey = keys.getSummaryQueryKey();
    queryClient.setQueryData(summaryKey, { ok: true });
    stubFetch(() => errorEnvelope(9999, "삭제 실패", 500));
    const onDeleted = vi.fn();
    const onError = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      mutations.deleteVideoMutationOptions({
        queryClient,
        onDeleted,
        onError,
      }),
    );

    await expect(
      observer.mutate({ videoId: VIDEO_ID, gridId: GRID_ID }),
    ).rejects.toThrow();

    expect(queryClient.getQueryState(summaryKey)?.isInvalidated).toBe(false);
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("삭제가 진행 중인 동안 재발사가 무시된다 — 중복 DELETE 없음 (L6·codex 리뷰 1)", async () => {
    const { mutations, queryClient } = await loadModule();
    const { received, started, release } = stubGatedFetch(() =>
      envelopeResponse(null),
    );
    const observer = new MutationObserver(
      queryClient,
      mutations.deleteVideoMutationOptions({ queryClient }),
    );
    const mutate = vi.fn();
    const guarded = mutations.guardMutate(
      queryClient,
      mutations.VIDEO_MUTATION_KEYS.deleteVideo,
      mutate,
    );

    const inFlight = observer.mutate({ videoId: VIDEO_ID, gridId: GRID_ID });
    await started;
    guarded({ videoId: VIDEO_ID, gridId: GRID_ID });

    expect(mutate).not.toHaveBeenCalled();
    expect(received).toHaveLength(1);

    release();
    await inFlight;
    guarded({ videoId: VIDEO_ID, gridId: GRID_ID });

    expect(mutate).toHaveBeenCalledTimes(1);
  });
});

describe("영상 신고 mutation (L11)", () => {
  it("선택한 사유를 서버 enum으로 매핑해 POST /api/videos/{videoId}/reports가 발사된다 (L11)", async () => {
    const { mutations, queryClient } = await loadModule();
    const received = stubFetch(() => envelopeResponse(null));
    const observer = new MutationObserver(
      queryClient,
      mutations.reportVideoMutationOptions({}),
    );

    await observer.mutate({ videoId: VIDEO_ID, reasonId: "privacy" });

    expect(received).toEqual([
      {
        method: "POST",
        pathname: `/api/videos/${VIDEO_ID}/reports`,
        body: JSON.stringify({ reason: "PRIVACY" }),
      },
    ]);
  });

  it("중복 신고(409)면 실패 콜백이 그 에러를 그대로 받아 안내를 가른다 (L11)", async () => {
    const { mutations, queryClient } = await loadModule();
    stubFetch(() => errorEnvelope(11409, "이미 신고한 영상입니다", 409));
    const onFailed = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      mutations.reportVideoMutationOptions({ onFailed }),
    );

    await expect(
      observer.mutate({ videoId: VIDEO_ID, reasonId: "spam" }),
    ).rejects.toThrow();

    const { reportFailureNotice } = await import("../model/report");
    expect(reportFailureNotice(onFailed.mock.calls[0][0])).toEqual({
      message: "이미 신고한 영상이에요. 검토 후 조치돼요.",
      shouldClose: true,
    });
  });

  it("신고 제출이 진행 중인 동안 재발사가 무시된다 — 중복 POST 없음 (L11·codex 리뷰 2)", async () => {
    const { mutations, queryClient } = await loadModule();
    const { received, started, release } = stubGatedFetch(() =>
      envelopeResponse(null),
    );
    const observer = new MutationObserver(
      queryClient,
      mutations.reportVideoMutationOptions({}),
    );
    const mutate = vi.fn();
    const guarded = mutations.guardMutate(
      queryClient,
      mutations.VIDEO_MUTATION_KEYS.report,
      mutate,
    );

    const inFlight = observer.mutate({
      videoId: VIDEO_ID,
      reasonId: "privacy",
    });
    await started;
    guarded({ videoId: VIDEO_ID, reasonId: "spam" });

    expect(mutate).not.toHaveBeenCalled();
    expect(received).toHaveLength(1);

    release();
    await inFlight;
    guarded({ videoId: VIDEO_ID, reasonId: "spam" });

    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
