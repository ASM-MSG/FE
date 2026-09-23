import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 행사 알림 구독 mutation의 낙관·성공 기록·롤백 (MSG-603 L3).
 * `QueryClient` + `MutationObserver`로 화면과 같은 옵션 객체를 구동한다(inbox-mutations.test 관례).
 */
const API_BASE = "https://api.test.local";
const OCCURRENCE_ID = 7;

const load = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { eventSubscriptionMutationOptions } =
    await import("./event-subscription-mutation");
  const { getOccurrenceDetailQueryKey } =
    await import("../../../shared/api/query-options");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const key = getOccurrenceDetailQueryKey({
    path: { occurrenceId: OCCURRENCE_ID },
  });
  const seed = (notificationOn: boolean) =>
    queryClient.setQueryData(key, {
      developCode: 0,
      message: "ok",
      data: { title: "행사", status: "UPCOMING", notificationOn },
    });
  const cached = () =>
    queryClient.getQueryData<{
      data: { notificationOn: boolean; title: string };
    }>(key)?.data;
  const observe = () =>
    new MutationObserver(
      queryClient,
      eventSubscriptionMutationOptions(queryClient, OCCURRENCE_ID),
    );
  return { seed, cached, observer: observe(), observe };
};

const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: Array<{ method: string; pathname: string; body: string }> =
    [];
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

describe("행사 알림 구독 토글 (L3)", () => {
  it("PUT /api/event-occurrences/{id}/notification {enabled} — 성공 응답의 enabled를 캐시에 기록한다", async () => {
    const t = await load();
    t.seed(false);
    const received = stubFetch(() => envelopeResponse({ enabled: true }));

    await t.observer.mutate({ occurrenceId: OCCURRENCE_ID, enabled: true });

    expect(received).toEqual([
      {
        method: "PUT",
        pathname: `/api/event-occurrences/${OCCURRENCE_ID}/notification`,
        body: JSON.stringify({ enabled: true }),
      },
    ]);
    expect(t.cached()).toMatchObject({ notificationOn: true, title: "행사" });
  });

  it("서버가 노출값 false를 돌려주면(요청 사이 회차 종료) 낙관 true를 덮어쓴다", async () => {
    const t = await load();
    t.seed(false);
    stubFetch(() => envelopeResponse({ enabled: false }));

    await t.observer.mutate({ occurrenceId: OCCURRENCE_ID, enabled: true });

    expect(t.cached()?.notificationOn).toBe(false);
  });

  it("실패하면 직전 값으로 되돌린다", async () => {
    const t = await load();
    t.seed(false);
    stubFetch(() => errorEnvelope(13422, "행사 마감", 409));

    await t.observer
      .mutate({ occurrenceId: OCCURRENCE_ID, enabled: true })
      .catch(() => {});

    expect(t.cached()?.notificationOn).toBe(false);
  });
  it("재마운트로 겹친 두 요청 — 늦게 온 앞 요청의 응답은 뒤 요청의 값을 덮지 않는다 (codex P2)", async () => {
    const t = await load();
    t.seed(false);
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    stubFetch(async (request) => {
      const { enabled } = JSON.parse(await request.clone().text()) as {
        enabled: boolean;
      };
      if (enabled) await firstGate; // 켜기(앞 요청)는 붙잡아 두고 끄기(뒤 요청)가 먼저 끝난다
      return envelopeResponse({ enabled });
    });

    const first = t.observer.mutate({
      occurrenceId: OCCURRENCE_ID,
      enabled: true,
    });
    // 위치 상세에 들어갔다 돌아온 새 행 = 새 observer
    await t.observe().mutate({ occurrenceId: OCCURRENCE_ID, enabled: false });
    expect(t.cached()?.notificationOn).toBe(false);

    releaseFirst();
    await first;

    expect(t.cached()?.notificationOn).toBe(false);
  });

  it("겹친 두 요청 중 앞 요청이 늦게 실패해도 뒤 요청의 낙관값은 롤백되지 않는다 (codex P2)", async () => {
    const t = await load();
    t.seed(false);
    let failFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      failFirst = resolve;
    });
    stubFetch(async (request) => {
      const { enabled } = JSON.parse(await request.clone().text()) as {
        enabled: boolean;
      };
      if (enabled) {
        await firstGate;
        return errorEnvelope(10500, "서버 오류", 500);
      }
      return envelopeResponse({ enabled });
    });

    const first = t.observer
      .mutate({ occurrenceId: OCCURRENCE_ID, enabled: true })
      .catch(() => {});
    await t.observe().mutate({ occurrenceId: OCCURRENCE_ID, enabled: false });
    failFirst();
    await first;

    expect(t.cached()?.notificationOn).toBe(false);
  });
});
