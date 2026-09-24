import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";
import { inboxItem, inboxPage as page } from "../../../test/inbox-fixture";
import type { InboxData, InboxItem } from "../model/inbox";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 읽음·모두 읽음 mutation의 낙관·롤백·무효화 계약 (MSG-602 L7).
 * RN 렌더 테스트가 없어 `QueryClient` + `MutationObserver`로 화면과 같은 옵션 객체를 구동한다
 * (use-notification-toggle.test 관례). 네트워크는 fetch 스텁 한 곳에서만 가른다.
 */

const API_BASE = "https://api.test.local";

const item = (notificationId: number, read = false) =>
  inboxItem(notificationId, read, "VIDEO");

const load = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { markAllReadMutationOptions, markReadMutationOptions } =
    await import("./inbox-mutations");
  const { getInboxInfiniteQueryKey, getUnreadCountQueryKey } =
    await import("../../../shared/api/query-options");
  const { flattenInboxPages } = await import("../model/inbox");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const inboxKey = getInboxInfiniteQueryKey();
  const unreadKey = getUnreadCountQueryKey();

  const seed = (items: InboxItem[], unread: number) => {
    queryClient.setQueryData<InboxData>(inboxKey, {
      pages: [page(items)],
      pageParams: [{}],
    });
    queryClient.setQueryData(unreadKey, {
      developCode: 0,
      message: "ok",
      data: { count: unread },
    });
  };
  const readFlags = () =>
    flattenInboxPages(queryClient.getQueryData<InboxData>(inboxKey)?.pages).map(
      (n) => n.read,
    );
  const unreadOf = () =>
    queryClient.getQueryData<{ data: { count: number } }>(unreadKey)?.data
      .count;

  return {
    queryClient,
    inboxKey,
    unreadKey,
    seed,
    readFlags,
    unreadOf,
    markRead: new MutationObserver(
      queryClient,
      markReadMutationOptions(queryClient),
    ),
    markAllRead: new MutationObserver(
      queryClient,
      markAllReadMutationOptions(queryClient),
    ),
  };
};

const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: Array<{ method: string; pathname: string }> = [];
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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("markRead (L7)", () => {
  it("낙관으로 그 항목만 read=true, 안읽음 −1 — 요청은 PATCH /api/notifications/{id}/read", async () => {
    const t = await load();
    t.seed([item(2), item(1)], 2);
    const received = stubFetch(() => envelopeResponse(null));

    await t.markRead.mutate({ notificationId: 1 });

    expect(received).toEqual([
      { method: "PATCH", pathname: "/api/notifications/1/read" },
    ]);
    expect(t.readFlags()).toEqual([false, true]);
    expect(t.unreadOf()).toBe(1);
  });

  it("이미 읽은 항목을 또 처리해도 안읽음은 줄지 않는다", async () => {
    const t = await load();
    t.seed([item(2), item(1, true)], 1);
    stubFetch(() => envelopeResponse(null));

    await t.markRead.mutate({ notificationId: 1 });

    expect(t.unreadOf()).toBe(1);
  });

  it("실패하면 되돌리지 않고 목록·안읽음 두 캐시를 무효화해 서버 정본으로 재동기화한다 (codex P2)", async () => {
    const t = await load();
    t.seed([item(2), item(1)], 2);
    stubFetch(() => errorEnvelope(10404, "없는 알림", 404));

    await t.markRead.mutate({ notificationId: 1 }).catch(() => {});

    expect(t.queryClient.getQueryState(t.inboxKey)?.isInvalidated).toBe(true);
    expect(t.queryClient.getQueryState(t.unreadKey)?.isInvalidated).toBe(true);
  });

  it("겹친 요청 중 하나가 실패해도 다른 요청이 성공한 읽음은 캐시에 남는다 (codex P2)", async () => {
    const t = await load();
    t.seed([item(2), item(1)], 2);
    stubFetch((request) =>
      request.url.endsWith("/1/read")
        ? errorEnvelope(10500, "서버 오류", 500)
        : envelopeResponse(null),
    );

    await Promise.all([
      t.markRead.mutate({ notificationId: 1 }).catch(() => {}),
      t.markRead.mutate({ notificationId: 2 }),
    ]);

    // 스냅숏 롤백이었다면 2번까지 안읽음으로 되돌아갔다 — 무효화 방식은 낙관값을 유지한 채 재조회를 예약한다
    expect(t.readFlags()).toEqual([true, true]);
    expect(t.queryClient.getQueryState(t.inboxKey)?.isInvalidated).toBe(true);
  });

  it("성공 후 안읽음 캐시를 무효화한다 — 서버 정본으로 재수렴", async () => {
    const t = await load();
    t.seed([item(1)], 1);
    stubFetch(() => envelopeResponse(null));

    await t.markRead.mutate({ notificationId: 1 });

    expect(t.queryClient.getQueryState(t.unreadKey)?.isInvalidated).toBe(true);
  });
});

describe("markAllRead (L7)", () => {
  it("전부 read=true + 안읽음 0 — 요청은 PATCH /api/notifications/read-all", async () => {
    const t = await load();
    t.seed([item(3), item(2, true), item(1)], 2);
    const received = stubFetch(() => envelopeResponse(null));

    await t.markAllRead.mutate();

    expect(received).toEqual([
      { method: "PATCH", pathname: "/api/notifications/read-all" },
    ]);
    expect(t.readFlags()).toEqual([true, true, true]);
    expect(t.unreadOf()).toBe(0);
  });

  it("실패하면 목록·안읽음을 무효화한다", async () => {
    const t = await load();
    t.seed([item(3), item(1)], 2);
    stubFetch(() => errorEnvelope(10500, "서버 오류", 500));

    await t.markAllRead.mutate().catch(() => {});

    expect(t.queryClient.getQueryState(t.inboxKey)?.isInvalidated).toBe(true);
    expect(t.queryClient.getQueryState(t.unreadKey)?.isInvalidated).toBe(true);
  });
});
