import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldShowConsentGate } from "../../features/auth/model/consent-gate";
import { envelopeResponse } from "../../test/envelope-response";

/**
 * 세션 전환 캐시 초기화 계약 (MSG-422 재작업 1회차 — AC 1의 회귀 방지).
 *
 * 잡는 결함: 로그인 성공 핸들러가 `queryClient.clear()`로 캐시를 비우면, 그 순간
 * **이미 구독 중이던** 옵저버가 파괴된 Query에 묶인 채 남는다(재부착은 그 옵저버의
 * 다음 렌더 `setOptions`에서만 일어난다). 로그인 이후 재렌더 트리거가 인증 스토어뿐인
 * 루트 게이트는 그 렌더가 오지 않아 `pending/fetching`에 영구 고정됐다 — 게이트 미표시.
 *
 * 모바일은 RN 렌더 테스트 인프라가 없어(MSG-292 확정 4) 화면 대신 **구독만 하고 다시
 * 렌더되지 않는 옵저버**로 그 상황을 재현한다. `setOptions`를 호출하지 않는 것이 이
 * 테스트의 핵심 조건이다 — 호출하면 재부착이 일어나 결함이 가려진다.
 */

const API_BASE = "https://api.test.local";

/** client-config가 모듈 로드 시점에 env를 읽으므로 스텁 후 동적 import (auth-pipeline.test 선례) */
const loadApi = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { getMeOptions } = await import("./query-options");
  const { unwrapEnvelope } = await import("./envelope");
  const { resetSessionCache } = await import("./reset-session-cache");
  return { getMeOptions, unwrapEnvelope, resetSessionCache };
};

describe("resetSessionCache — 로그인 직후 이전 세션 캐시 폐기 (AC 1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("구독 중인 게이트 옵저버는 재렌더 없이도 새 세션의 getMe 성공을 받는다 (AC 1)", async () => {
    const { getMeOptions, unwrapEnvelope, resetSessionCache } = await loadApi();
    vi.stubGlobal("fetch", async () =>
      envelopeResponse({ locationConsent: false }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const observer = new QueryObserver(queryClient, {
      ...getMeOptions(),
      enabled: true,
      select: (envelope) => unwrapEnvelope(envelope).locationConsent,
    });
    const unsubscribe = observer.subscribe(() => {});

    // 로그인 성공 핸들러가 하는 일 — 조회가 아직 비행 중일 때 캐시를 비운다
    void resetSessionCache(queryClient);

    await vi.waitFor(() =>
      expect(observer.getCurrentResult().isSuccess).toBe(true),
    );
    const { isSuccess, data } = observer.getCurrentResult();
    expect(
      shouldShowConsentGate({
        isAuthenticated: true,
        consentKnown: isSuccess,
        locationConsent: data,
      }),
    ).toBe(true);
    unsubscribe();
  });
});
