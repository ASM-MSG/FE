import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";
// 타입 전용 import — 런타임 로드가 없어 env 스텁 전 평가돼도 안전하다
import type { PreferencesEnvelope } from "../model/notification-toggle";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — `알림 받기` 단일 토글의 저장·낙관·롤백·연타 계약
 * (기준 2·3·5·6). 모바일은 RN 렌더 테스트 인프라가 없어(vitest.config 상단 정책)
 * `renderHook` 대신 실제 `QueryClient` + `MutationObserver`로 훅과 **같은 옵션 객체**를
 * 구동한다 (reset-session-cache.test 선례). 네트워크는 fetch 스텁 한 곳에서만 가른다.
 *
 * 요청 URL·body를 단정하는 이유: 기준 2가 "5개 카테고리 전부에 어떤 값이 나가는가"를
 * 규정하는 수용 기준 자체이기 때문이다(구현 세부가 아니다 — 서버에 마스터 스위치가 없어
 * FE의 합성 규칙이 곧 계약이다).
 */

const API_BASE = "https://api.test.local";
const CATEGORIES = ["BADGE", "HOTZONE", "REMIND", "VIDEO", "WEEKLY"] as const;

const loadToggle = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { createNotificationToggle, notificationToggleMutationOptions } =
    await import("./use-notification-toggle");
  const { deriveMasterToggle, readPreferences } =
    await import("../model/notification-toggle");
  const { getPreferencesQueryKey } =
    await import("../../../shared/api/query-options");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const queryKey = getPreferencesQueryKey();

  /** 캐시에 저장된 봉투에서 화면이 보는 토글 값을 읽는다 */
  const masterOf = () => {
    const cached = queryClient.getQueryData<PreferencesEnvelope>(queryKey);
    return cached === undefined
      ? undefined
      : deriveMasterToggle(readPreferences(cached));
  };
  const seed = (preferences: PreferencesEnvelope["data"]["preferences"]) =>
    queryClient.setQueryData<PreferencesEnvelope>(queryKey, {
      developCode: 0,
      message: "ok",
      data: { preferences },
    });
  const observer = new MutationObserver(
    queryClient,
    notificationToggleMutationOptions(queryClient),
  );
  /** 화면과 같은 배선 — 연타 가드가 걸린 트리거 (기준 6) */
  const toggle = createNotificationToggle(queryClient, (enabled) => {
    void observer.mutate(enabled).catch(() => {});
  });

  return { queryClient, queryKey, observer, toggle, masterOf, seed };
};

/** 요청 스텁 — 메서드·경로·본문을 전송 시점에 기록한다 (auth-pipeline.test 관례) */
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

const preferencesResponse = (enabled: boolean) =>
  envelopeResponse({
    preferences: CATEGORIES.map((category) => ({ category, enabled })),
  });

/** 응답 시점을 테스트가 잡는 지연 응답 — 낙관 반영·연타 가드 관찰용 */
const deferredResponse = () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release };
};

const categoryOf = (pathname: string) => pathname.split("/").at(-1);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("알림 받기 토글 저장 (기준 2)", () => {
  it("토글을 끄면 5개 카테고리 전부에 enabled:false PATCH가 발사된다 (기준 2)", async () => {
    const { observer, seed } = await loadToggle();
    seed([]);
    const received = stubFetch(() => preferencesResponse(false));

    await observer.mutate(false);

    expect(received).toHaveLength(5);
    expect(received.map((r) => categoryOf(r.pathname)).sort()).toEqual(
      [...CATEGORIES].sort(),
    );
    expect(received.every((r) => r.method === "PATCH")).toBe(true);
    expect(received.every((r) => JSON.parse(r.body).enabled === false)).toBe(
      true,
    );
    expect(
      received.every((r) =>
        r.pathname.startsWith("/api/notifications/preferences/"),
      ),
    ).toBe(true);
  });

  it("토글을 켜면 같은 5개 카테고리에 enabled:true PATCH가 발사된다 (기준 2)", async () => {
    const { observer, seed } = await loadToggle();
    seed(CATEGORIES.map((category) => ({ category, enabled: false })));
    const received = stubFetch(() => preferencesResponse(true));

    await observer.mutate(true);

    expect(received).toHaveLength(5);
    expect(received.every((r) => JSON.parse(r.body).enabled === true)).toBe(
      true,
    );
  });
});

describe("낙관 전환과 성공 기록 (기준 3)", () => {
  it("응답 전에도 토글이 새 상태로 보이고, 성공 후 GET 재조회 없이 그 상태가 유지된다 (기준 3)", async () => {
    const { observer, seed, masterOf } = await loadToggle();
    seed([]);
    const { gate, release } = deferredResponse();
    const received = stubFetch(async () => {
      await gate;
      return preferencesResponse(false);
    });

    const settled = observer.mutate(false);
    await vi.waitFor(() => expect(masterOf()).toBe(false));
    release();
    await settled;

    expect(masterOf()).toBe(false);
    // 재조회가 있었다면 GET이 섞인다 — 5건 전부 PATCH여야 한다 (invalidate 금지)
    expect(received.every((r) => r.method === "PATCH")).toBe(true);
    expect(received).toHaveLength(5);
  });
});

describe("저장 실패 롤백 (기준 5)", () => {
  it("5건 중 하나라도 실패하면 직전 상태로 되돌아가고 실패가 관찰된다 (기준 5)", async () => {
    const { observer, seed, queryClient, queryKey, masterOf } =
      await loadToggle();
    // 직전 상태: BADGE만 꺼진 부분 상태 — 롤백이 '표시값'이 아니라 '스냅숏'을 되돌리는지 본다
    const before = [{ category: "BADGE" as const, enabled: false }];
    seed(before);
    stubFetch((request) =>
      categoryOf(new URL(request.url).pathname) === "WEEKLY"
        ? errorEnvelope(9999, "저장 실패", 500)
        : preferencesResponse(true),
    );

    await expect(observer.mutate(true)).rejects.toThrow();

    expect(masterOf()).toBe(true);
    expect(queryClient.getQueryData(queryKey)).toEqual({
      developCode: 0,
      message: "ok",
      data: { preferences: before },
    });
    expect(observer.getCurrentResult().isError).toBe(true);
  });
});

describe("연타 가드 (기준 6)", () => {
  it("요청이 진행 중일 때 재탭해도 중복 요청이 나가지 않는다 (기준 6)", async () => {
    const { toggle, seed } = await loadToggle();
    seed([]);
    const { gate, release } = deferredResponse();
    const received = stubFetch(async () => {
      await gate;
      return preferencesResponse(false);
    });

    toggle(false);
    await vi.waitFor(() => expect(received).toHaveLength(5));
    toggle(true);
    release();
    await vi.waitFor(() => expect(received).toHaveLength(5));

    expect(received).toHaveLength(5);
    expect(received.every((r) => JSON.parse(r.body).enabled === false)).toBe(
      true,
    );
  });
});
