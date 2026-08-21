import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch, type ReceivedRequest } from "@/test/stub-fetch";
import { usePushNoticeStore } from "../model/push-notice-store";
import { usePreferenceMutation } from "./use-preference-mutation";
import { usePreferencesQuery } from "./use-preferences-query";

/**
 * 카테고리 수신 토글 mutation 훅 (MSG-409 AC 6·7·8, test-first).
 * - 낙관 반영 → 성공 응답(전체 상태) setQueryData 직접 기록, invalidate/refetch 금지 (AC 6)
 * - 실패 롤백 + push-notice-store 오류 안내 (AC 7)
 * - 카테고리별 busy — 연타 중첩 발사 차단 (AC 8)
 * 검증은 조회 훅(usePreferencesQuery)이 보는 캐시 값으로 한다 — 캐시 내부 구조 단정 금지.
 */
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

/** 조회 + 토글을 한 트리에서 — 뷰가 소비하는 형태 그대로 관찰한다 */
const useHarness = () => ({
  query: usePreferencesQuery(),
  mutation: usePreferenceMutation(),
});

const enabledOf = (
  result: { current: ReturnType<typeof useHarness> },
  category: string,
) =>
  result.current.query.data
    ?.flatMap((g) => g.items)
    .find((i) => i.category === category)?.enabled;

const patchPathOf = (received: ReceivedRequest[]) =>
  received
    .filter((r) => r.request.method === "PATCH")
    .map((r) => new URL(r.request.url).pathname);

/** GET은 전부 on(빈 배열), PATCH는 route로 위임하는 기본 스텁 */
const stubPreferencesApi = (
  onPatch: (request: Request) => Response | Promise<Response>,
) =>
  stubFetch((request) => {
    if (request.method === "PATCH") return onPatch(request);
    return envelopeResponse({ preferences: [] });
  });

const renderHarness = async () => {
  const rendered = renderHook(() => useHarness(), { wrapper });
  await waitFor(() =>
    expect(rendered.result.current.query.isSuccess).toBe(true),
  );
  return rendered;
};

beforeEach(() => {
  usePushNoticeStore.setState({ toggleNotice: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePreferenceMutation — 낙관 업데이트 + 응답 직접 기록 (AC 6)", () => {
  it("토글 시 PATCH /preferences/{category}가 발사되고 UI 값이 즉시 전환된다 (AC 6)", async () => {
    // 응답을 붙잡아 둔다 — 왕복 완료 전 낙관 반영을 관찰
    let resolvePatch!: (response: Response) => void;
    const received = stubPreferencesApi(
      () => new Promise<Response>((resolve) => (resolvePatch = resolve)),
    );
    const { result } = await renderHarness();
    expect(enabledOf(result, "HOTZONE")).toBe(true);

    act(() => result.current.mutation.toggle("HOTZONE", false));

    await waitFor(() => expect(enabledOf(result, "HOTZONE")).toBe(false));
    expect(patchPathOf(received)).toEqual([
      "/api/notifications/preferences/HOTZONE",
    ]);
    expect(received.find((r) => r.request.method === "PATCH")?.body).toEqual({
      enabled: false,
    });

    resolvePatch(
      envelopeResponse({
        preferences: [{ category: "HOTZONE", enabled: false }],
      }),
    );
    await waitFor(() =>
      expect(result.current.mutation.isBusy("HOTZONE")).toBe(false),
    );
  });

  it("성공 응답(전체 상태)이 캐시에 직접 기록되고 재조회(GET)는 없다 (AC 6)", async () => {
    const received = stubPreferencesApi(() =>
      envelopeResponse({
        preferences: [{ category: "HOTZONE", enabled: false }],
      }),
    );
    const { result } = await renderHarness();

    act(() => result.current.mutation.toggle("HOTZONE", false));

    await waitFor(() =>
      expect(result.current.mutation.isBusy("HOTZONE")).toBe(false),
    );
    expect(enabledOf(result, "HOTZONE")).toBe(false);
    // invalidate/refetch 금지(티켓 명시) — GET은 최초 1회뿐
    const getCalls = received.filter((r) => r.request.method === "GET");
    expect(getCalls).toHaveLength(1);
  });

  it("먼저 온 응답이 아직 왕복 중인 다른 행의 낙관 값을 덮지 않는다 (AC 6·8 경계 — 리스크 고정)", async () => {
    // HOTZONE 응답이 먼저 도착하는 동안 WEEKLY는 in-flight — 응답(전체 상태)에는
    // WEEKLY 행이 없다(=true). 낙관 false가 보존돼야 한다
    let resolveHotzone!: (response: Response) => void;
    let resolveWeekly!: (response: Response) => void;
    const received = stubPreferencesApi((request) => {
      const { pathname } = new URL(request.url);
      return new Promise<Response>((resolve) => {
        if (pathname.endsWith("/HOTZONE")) resolveHotzone = resolve;
        else resolveWeekly = resolve;
      });
    });
    const { result } = await renderHarness();

    act(() => result.current.mutation.toggle("HOTZONE", false));
    act(() => result.current.mutation.toggle("WEEKLY", false));
    // fetch 발사는 비동기 — 두 PATCH가 모두 나간 뒤에 응답을 풀어준다
    await waitFor(() => expect(patchPathOf(received)).toHaveLength(2));
    resolveHotzone(
      envelopeResponse({
        preferences: [{ category: "HOTZONE", enabled: false }],
      }),
    );

    await waitFor(() =>
      expect(result.current.mutation.isBusy("HOTZONE")).toBe(false),
    );
    expect(enabledOf(result, "WEEKLY")).toBe(false); // 낙관 값 보존
    expect(enabledOf(result, "HOTZONE")).toBe(false);

    resolveWeekly(
      envelopeResponse({
        preferences: [
          { category: "HOTZONE", enabled: false },
          { category: "WEEKLY", enabled: false },
        ],
      }),
    );
    await waitFor(() =>
      expect(result.current.mutation.isBusy("WEEKLY")).toBe(false),
    );
    expect(enabledOf(result, "WEEKLY")).toBe(false);
  });
});

describe("usePreferenceMutation — 실패 롤백 (AC 7)", () => {
  it("PATCH 실패 시 해당 토글이 원래 값으로 돌아오고 오류 안내가 노출된다 (AC 7)", async () => {
    stubPreferencesApi(() => new Response(null, { status: 500 }));
    const { result } = await renderHarness();
    expect(enabledOf(result, "BADGE")).toBe(true);

    act(() => result.current.mutation.toggle("BADGE", false));

    await waitFor(() =>
      expect(usePushNoticeStore.getState().toggleNotice).toBe("error"),
    );
    expect(enabledOf(result, "BADGE")).toBe(true); // 롤백
    expect(result.current.mutation.isBusy("BADGE")).toBe(false); // 재조작 가능
  });
});

describe("usePreferenceMutation — 행 단위 busy (AC 8)", () => {
  it("왕복 중 같은 행은 busy고, 재조작해도 요청이 중첩 발사되지 않는다 (AC 8)", async () => {
    let resolvePatch!: (response: Response) => void;
    const received = stubPreferencesApi(
      () => new Promise<Response>((resolve) => (resolvePatch = resolve)),
    );
    const { result } = await renderHarness();

    act(() => result.current.mutation.toggle("VIDEO", false));
    await waitFor(() =>
      expect(result.current.mutation.isBusy("VIDEO")).toBe(true),
    );
    act(() => result.current.mutation.toggle("VIDEO", true)); // 연타 — 차단돼야 한다

    expect(patchPathOf(received)).toHaveLength(1);
    // 다른 행은 busy가 아니다 — 행 단위 가드
    expect(result.current.mutation.isBusy("BADGE")).toBe(false);

    resolvePatch(
      envelopeResponse({
        preferences: [{ category: "VIDEO", enabled: false }],
      }),
    );
    await waitFor(() =>
      expect(result.current.mutation.isBusy("VIDEO")).toBe(false),
    );
  });
});
