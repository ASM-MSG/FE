import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 대표 뱃지 저장의 요청 계약·성공 후처리·실패 보존
 * (S6·S7). 모바일은 RN 렌더 테스트 인프라가 없어 `renderHook` 대신 실제 `QueryClient` +
 * `MutationObserver`로 훅과 **같은 옵션 객체**를 구동한다 (use-notification-toggle.test 선례).
 */

const API_BASE = "https://api.test.local";

const loadMutation = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { replaceFeaturedMutationOptions } =
    await import("./use-badge-mutations");
  const { findMyBadgesQueryKey } =
    await import("../../../shared/api/query-options");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const badgesKey = findMyBadgesQueryKey();
  // 무효화가 관찰되려면 캐시에 해당 쿼리가 있어야 한다 — 신선한 상태로 심는다
  queryClient.setQueryData(badgesKey, envelopeResponse([]));
  const saved: number[] = [];
  const observer = new MutationObserver(
    queryClient,
    replaceFeaturedMutationOptions(queryClient, {
      onSaved: () => saved.push(1),
    }),
  );
  return { queryClient, badgesKey, observer, saved };
};

const stubFetch = (route: (request: Request) => Response) => {
  const received: { method: string; pathname: string; body: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      received.push({
        method: input.method,
        pathname: new URL(input.url).pathname,
        body: input.body === null ? "" : await input.clone().text(),
      });
      return route(input);
    }),
  );
  return received;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("대표 뱃지 저장 (S6)", () => {
  it("선택 배열 순서 그대로 PUT /api/badges/featured가 1회 발사된다", async () => {
    const { observer } = await loadMutation();
    const received = stubFetch(() => envelopeResponse(null));

    await observer.mutate([42, 7]);

    expect(received).toHaveLength(1);
    expect(received[0].method).toBe("PUT");
    expect(received[0].pathname).toBe("/api/badges/featured");
    expect(JSON.parse(received[0].body)).toEqual({ badgeIds: [42, 7] });
  });

  it("전부 해제는 빈 배열로 나간다 (경계)", async () => {
    const { observer } = await loadMutation();
    const received = stubFetch(() => envelopeResponse(null));

    await observer.mutate([]);

    expect(JSON.parse(received[0].body)).toEqual({ badgeIds: [] });
  });

  it("성공하면 뱃지 카탈로그가 무효화되고 onSaved가 불린다 (편집 모드 종료)", async () => {
    const { queryClient, badgesKey, observer, saved } = await loadMutation();
    stubFetch(() => envelopeResponse(null));

    await observer.mutate([42]);

    expect(saved).toHaveLength(1);
    expect(queryClient.getQueryState(badgesKey)?.isInvalidated).toBe(true);
  });
});

describe("대표 뱃지 저장 실패 (S7)", () => {
  it("실패하면 onSaved가 불리지 않아 편집 상태가 유지되고 재시도할 수 있다", async () => {
    const { queryClient, badgesKey, observer, saved } = await loadMutation();
    stubFetch(() => errorEnvelope(5000, "저장 실패", 500));

    await expect(observer.mutate([42])).rejects.toThrow();

    expect(saved).toHaveLength(0);
    expect(queryClient.getQueryState(badgesKey)?.isInvalidated).toBe(false);
  });
});
