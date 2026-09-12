import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 사용자 차단·해제 mutation의 요청·성공 처리·실패 계약
 * (MSG-570 기준 4·6·7·8·14·15). RN 렌더 인프라가 없어 훅이 그대로 넘기는 옵션 객체를
 * MutationObserver로 구동한다 (video-mutations.test 관례).
 */

const API_BASE = "https://api.test.local";
const USER_ID = 42;
const GRID_ID = "16858_11420";

const loadModule = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const mutations = await import("./user-block-mutations");
  const keys = await import("../../../shared/api/query-options");
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
      });
      return route(input);
    }),
  );
  return received;
};

/** 응답을 붙잡아 두는 fetch 스텁 — in-flight 창을 열어 연타 가드를 관찰한다 */
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

const blockedEnvelope = (userIds: number[]) => ({
  developCode: 0,
  message: "ok",
  data: userIds.map((userId) => ({
    userId,
    nickname: `user${userId}`,
    profileImageUrl: null,
    blockedAt: "2026-09-11T02:30:00",
  })),
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("사용자 차단 mutation (기준 4·6·7·8)", () => {
  it("[차단] → 작성자 userId를 경로로 POST /api/users/{userId}/block이 1회 발사된다 (기준 4)", async () => {
    const { mutations, queryClient } = await loadModule();
    const received = stubFetch(() => envelopeResponse(null));
    const observer = new MutationObserver(
      queryClient,
      mutations.blockUserMutationOptions({ queryClient }),
    );

    await observer.mutate({ userId: USER_ID });

    expect(received).toEqual([
      { method: "POST", pathname: `/api/users/${USER_ID}/block` },
    ]);
  });

  it("성공하면 격자 전역 영상 캐시가 무효화되고 완료 콜백이 불린다 (기준 5·6)", async () => {
    const { mutations, keys, queryClient } = await loadModule();
    const gridKey = keys.getGridGlobalVideosQueryKey({
      path: { gridId: GRID_ID },
    });
    queryClient.setQueryData(gridKey, { ok: true });
    stubFetch(() => envelopeResponse(null));
    const onBlocked = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      mutations.blockUserMutationOptions({ queryClient, onBlocked }),
    );

    await observer.mutate({ userId: USER_ID });

    expect(queryClient.getQueryState(gridKey)?.isInvalidated).toBe(true);
    expect(onBlocked).toHaveBeenCalledTimes(1);
  });

  it("실패하면 어떤 쿼리도 무효화되지 않고 완료 콜백 없이 실패 콜백만 불린다 — 다이얼로그가 남는다 (기준 7)", async () => {
    const { mutations, keys, queryClient } = await loadModule();
    const gridKey = keys.getGridGlobalVideosQueryKey({
      path: { gridId: GRID_ID },
    });
    queryClient.setQueryData(gridKey, { ok: true });
    stubFetch(() => errorEnvelope(9999, "차단 실패", 500));
    const onBlocked = vi.fn();
    const onError = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      mutations.blockUserMutationOptions({ queryClient, onBlocked, onError }),
    );

    await expect(observer.mutate({ userId: USER_ID })).rejects.toThrow();

    expect(queryClient.getQueryState(gridKey)?.isInvalidated).toBe(false);
    expect(onBlocked).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("차단 요청이 진행 중인 동안 재발사가 무시된다 — 중복 POST 없음 (기준 8)", async () => {
    const { mutations, queryClient } = await loadModule();
    const { received, started, release } = stubGatedFetch(() =>
      envelopeResponse(null),
    );
    const observer = new MutationObserver(
      queryClient,
      mutations.blockUserMutationOptions({ queryClient }),
    );
    const { guardMutate } =
      await import("../../video-actions/api/video-mutations");
    const mutate = vi.fn();
    const guarded = guardMutate(
      queryClient,
      mutations.USER_BLOCK_MUTATION_KEYS.block,
      mutate,
    );

    const inFlight = observer.mutate({ userId: USER_ID });
    await started;
    guarded({ userId: USER_ID });

    expect(mutate).not.toHaveBeenCalled();
    expect(received).toHaveLength(1);

    release();
    await inFlight;
    guarded({ userId: USER_ID });

    expect(mutate).toHaveBeenCalledTimes(1);
  });
});

describe("차단 해제 mutation (기준 14·15)", () => {
  it("[차단 해제] → 확인 없이 DELETE /api/users/{userId}/block이 발사된다 (기준 14)", async () => {
    const { mutations, queryClient } = await loadModule();
    const received = stubFetch(() => envelopeResponse(null));
    const observer = new MutationObserver(
      queryClient,
      mutations.unblockUserMutationOptions({ queryClient }),
    );

    await observer.mutate({ userId: USER_ID });

    expect(received).toEqual([
      { method: "DELETE", pathname: `/api/users/${USER_ID}/block` },
    ]);
  });

  it("성공하면 그 행이 차단 목록 캐시에서 즉시 제거되고(재조회 없음) 콘텐츠 목록은 무효화된다 (기준 14)", async () => {
    const { mutations, keys, queryClient } = await loadModule();
    const listKey = keys.getBlockedUsersQueryKey();
    queryClient.setQueryData(listKey, blockedEnvelope([3, USER_ID, 7]));
    const gridKey = keys.getGridGlobalVideosQueryKey({
      path: { gridId: GRID_ID },
    });
    queryClient.setQueryData(gridKey, { ok: true });
    stubFetch(() => envelopeResponse(null));
    const observer = new MutationObserver(
      queryClient,
      mutations.unblockUserMutationOptions({ queryClient }),
    );

    await observer.mutate({ userId: USER_ID });

    expect(
      queryClient
        .getQueryData<{ data: { userId: number }[] }>(listKey)
        ?.data.map((u) => u.userId),
    ).toEqual([3, 7]);
    expect(queryClient.getQueryState(listKey)?.isInvalidated).toBe(false);
    expect(queryClient.getQueryState(gridKey)?.isInvalidated).toBe(true);
  });

  it("실패하면 행이 남고 무효화 없이 실패 콜백만 불린다 (기준 15)", async () => {
    const { mutations, keys, queryClient } = await loadModule();
    const listKey = keys.getBlockedUsersQueryKey();
    queryClient.setQueryData(listKey, blockedEnvelope([3, USER_ID]));
    const gridKey = keys.getGridGlobalVideosQueryKey({
      path: { gridId: GRID_ID },
    });
    queryClient.setQueryData(gridKey, { ok: true });
    stubFetch(() => errorEnvelope(9999, "해제 실패", 500));
    const onError = vi.fn();
    const observer = new MutationObserver(
      queryClient,
      mutations.unblockUserMutationOptions({ queryClient, onError }),
    );

    await expect(observer.mutate({ userId: USER_ID })).rejects.toThrow();

    expect(
      queryClient
        .getQueryData<{ data: { userId: number }[] }>(listKey)
        ?.data.map((u) => u.userId),
    ).toEqual([3, USER_ID]);
    expect(queryClient.getQueryState(gridKey)?.isInvalidated).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
