import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";
// 타입 전용 import — 런타임 로드가 없어 env 스텁 전 평가돼도 안전하다
import type { ConsentEnvelope } from "./marketing-consent-mutation";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 마케팅 수신 동의 저장의 요청·seed·롤백·연타 계약
 * (기준 11·12·13). 모바일은 RN 렌더 테스트 인프라가 없어(vitest.config 상단 정책)
 * `renderHook` 대신 실제 `QueryClient` + `MutationObserver`로 훅과 **같은 옵션 객체**를
 * 구동한다 (MSG-426 `use-notification-toggle.test` 선례).
 */

const API_BASE = "https://api.test.local";

const consentStatus = (marketing: boolean) => ({
  ageOver14: true,
  serviceTerms: true,
  privacyPolicy: true,
  locationTerms: true,
  marketing,
  requiredCompleted: true,
});

const loadMutation = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const {
    createMarketingToggle,
    isMarketingTogglePending,
    marketingConsentMutationOptions,
  } = await import("./marketing-consent-mutation");
  const { getConsentStatusQueryKey } =
    await import("../../../shared/api/query-options");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const queryKey = getConsentStatusQueryKey();

  /** 캐시에 저장된 봉투에서 화면이 보는 마케팅 스위치 값을 읽는다 */
  const marketingOf = () =>
    queryClient.getQueryData<ConsentEnvelope>(queryKey)?.data.marketing;
  const seed = (marketing: boolean) =>
    queryClient.setQueryData<ConsentEnvelope>(queryKey, {
      developCode: 0,
      message: "ok",
      data: consentStatus(marketing),
    });
  const observer = new MutationObserver(
    queryClient,
    marketingConsentMutationOptions(queryClient),
  );
  /** 화면과 같은 배선 — 연타 가드가 걸린 트리거 (기준 13) */
  const toggle = createMarketingToggle(queryClient, (consented) => {
    void observer.mutate(consented).catch(() => {});
  });

  return {
    queryClient,
    queryKey,
    observer,
    toggle,
    marketingOf,
    seed,
    isMarketingTogglePending,
  };
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

/** 응답 시점을 테스트가 잡는 지연 응답 — 연타 가드 관찰용 */
const deferredResponse = () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("마케팅 수신 동의 저장 (기준 11)", () => {
  it("토글을 켜면 PUT /api/users/me/marketing-consent {consented:true}가 발사된다 (기준 11)", async () => {
    const { observer, seed } = await loadMutation();
    seed(false);
    const received = stubFetch(() => envelopeResponse(consentStatus(true)));

    await observer.mutate(true);

    expect(received).toHaveLength(1);
    expect(received[0].method).toBe("PUT");
    expect(received[0].pathname).toBe("/api/users/me/marketing-consent");
    expect(JSON.parse(received[0].body)).toEqual({ consented: true });
  });

  it("토글을 끄면 같은 엔드포인트에 consented:false가 발사된다 (기준 11)", async () => {
    const { observer, seed } = await loadMutation();
    seed(true);
    const received = stubFetch(() => envelopeResponse(consentStatus(false)));

    await observer.mutate(false);

    expect(JSON.parse(received[0].body)).toEqual({ consented: false });
  });

  it("성공 응답을 동의 상태 캐시에 seed하고 재조회하지 않는다 (기준 11)", async () => {
    const { observer, seed, marketingOf } = await loadMutation();
    seed(false);
    const received = stubFetch(() => envelopeResponse(consentStatus(true)));

    await observer.mutate(true);

    expect(marketingOf()).toBe(true);
    // 무효화 재조회가 있었다면 GET이 섞인다 — PUT 1건뿐이어야 한다
    expect(received).toHaveLength(1);
    expect(received.every((r) => r.method === "PUT")).toBe(true);
  });
});

describe("저장 실패 롤백 (기준 12)", () => {
  it("저장에 실패하면 스위치가 직전 값으로 되돌아가고 실패가 관찰된다 (기준 12)", async () => {
    const { observer, seed, queryClient, queryKey, marketingOf } =
      await loadMutation();
    seed(false);
    stubFetch(() => errorEnvelope(9999, "저장 실패", 500));

    await expect(observer.mutate(true)).rejects.toThrow();

    expect(marketingOf()).toBe(false);
    expect(queryClient.getQueryData(queryKey)).toEqual({
      developCode: 0,
      message: "ok",
      data: consentStatus(false),
    });
    expect(observer.getCurrentResult().isError).toBe(true);
  });
});

describe("연타 가드 (기준 13)", () => {
  it("저장이 진행 중이면 두 번째 탭이 새 요청을 만들지 않는다 (기준 13)", async () => {
    const { toggle, seed, isMarketingTogglePending, queryClient } =
      await loadMutation();
    seed(false);
    const { gate, release } = deferredResponse();
    const received = stubFetch(async () => {
      await gate;
      return envelopeResponse(consentStatus(true));
    });

    toggle(true);
    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(isMarketingTogglePending(queryClient)).toBe(true);
    toggle(false);
    release();

    await vi.waitFor(() =>
      expect(isMarketingTogglePending(queryClient)).toBe(false),
    );
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0].body)).toEqual({ consented: true });
  });
});
