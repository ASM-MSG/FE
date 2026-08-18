import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { findMyBadgesQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { useReplaceFeaturedBadges } from "./use-badge-mutations";

/** 적용된 대표 뱃지 응답 — FeaturedBadgeResponseDto 목록 */
const featuredResponse = (badgeIds: number[]) =>
  envelopeResponse(
    badgeIds.map((badgeId) => ({
      badgeId,
      code: `BADGE_${badgeId}`,
      name: `뱃지 ${badgeId}`,
      iconUrl: null,
    })),
  );

/**
 * 테스트마다 새 하네스로 훅을 마운트한다 — 격리된 QueryClient(캐시 격리 +
 * 에러 경로 타임아웃 방지 retry:false) + findMyBadges 캐시 시드(무효화 관찰용).
 */
const mountReplaceHook = (options?: { onSaved?: () => void }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const badgesKey = findMyBadgesQueryKey();
  client.setQueryData(badgesKey, { seeded: true });
  const { result } = renderHook(() => useReplaceFeaturedBadges(options), {
    wrapper,
  });
  return { client, badgesKey, result };
};

/** 훅 마운트 + mutate 발사 후 요청 종료(성공/실패)까지 대기하는 공통 셋업 */
const mutateAndSettle = async (
  badgeIds: number[],
  options?: { onSaved?: () => void },
) => {
  const harness = mountReplaceHook(options);
  act(() => {
    harness.result.current.mutate(badgeIds);
  });
  await waitFor(() => expect(harness.result.current.isPending).toBe(false));
  return harness;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useReplaceFeaturedBadges — 대표 뱃지 집합 교체 (AC 6·7·8·9)", () => {
  it("저장 시 PUT /api/badges/featured가 랭크 순서의 {badgeIds}로 호출된다 (AC 6)", async () => {
    const received = stubFetch(() => featuredResponse([5, 7]));

    const { result } = await mutateAndSettle([5, 7]);

    expect(result.current.isSuccess).toBe(true);
    expect(received).toHaveLength(1);
    expect(received[0].request.method).toBe("PUT");
    expect(new URL(received[0].request.url).pathname).toBe(
      "/api/badges/featured",
    );
    expect(received[0].body).toEqual({ badgeIds: [5, 7] });
  });

  it("전부 해제 저장은 빈 badgeIds 배열로 호출된다 (AC 6)", async () => {
    const received = stubFetch(() => featuredResponse([]));

    const { result } = await mutateAndSettle([]);

    expect(result.current.isSuccess).toBe(true);
    expect(received[0].body).toEqual({ badgeIds: [] });
  });

  // 성공/실패 거울 케이스 — 셋업이 같고 부수효과 기대만 갈리므로 케이스 테이블로 묶는다
  it.each([
    {
      name: "저장 성공 시 findMyBadges 쿼리가 무효화되고 onSaved가 불린다 (AC 7)",
      respond: () => featuredResponse([5]),
      status: "success",
      invalidated: true,
      onSavedCalls: 1,
    },
    {
      name: "저장 실패 시 에러 상태가 되고 무효화·onSaved가 실행되지 않는다 (AC 8)",
      respond: () => errorEnvelope(9999, "서버 오류", 500),
      status: "error",
      invalidated: false,
      onSavedCalls: 0,
    },
  ])("$name", async ({ respond, status, invalidated, onSavedCalls }) => {
    stubFetch(respond);
    const onSaved = vi.fn();

    const { client, badgesKey, result } = await mutateAndSettle([5], {
      onSaved,
    });

    expect(result.current.status).toBe(status);
    expect(client.getQueryState(badgesKey)?.isInvalidated).toBe(invalidated);
    expect(onSaved).toHaveBeenCalledTimes(onSavedCalls);
  });

  it("저장 요청이 진행 중이면 재발사를 무시한다 — 중복 PUT 방지 (AC 9)", async () => {
    // PUT은 영원히 보류 — 첫 요청이 in-flight인 동안 두 번째 mutate가 들어온다
    const received = stubFetch(() => new Promise<Response>(() => {}));
    const { result } = mountReplaceHook();

    act(() => {
      result.current.mutate([5]);
    });
    await waitFor(() => expect(result.current.isPending).toBe(true));
    act(() => {
      result.current.mutate([5, 7]);
    });

    expect(received).toHaveLength(1);
  });
});
