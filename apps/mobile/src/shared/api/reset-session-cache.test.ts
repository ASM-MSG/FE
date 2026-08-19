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

/**
 * 두 케이스의 공통 준비 — 새 세션의 getMe(미동의)를 응답하는 fetch 스텁과 빈 QueryClient,
 * 그리고 게이트 훅과 같은 배선(`getMeOptions` + 봉투 언랩 select)의 옵저버 팩토리를 만든다.
 * 옵션은 `QueryObserver`/`setOptions` 호출 자리에 인라인으로 둔다 — 밖으로 빼면 select의
 * 매개변수가 문맥 타입을 잃는다.
 */
const arrangeGate = async () => {
  const { getMeOptions, unwrapEnvelope, resetSessionCache } = await loadApi();
  vi.stubGlobal("fetch", async () =>
    envelopeResponse({ locationConsent: false }),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const subscribeGate = (enabled: boolean) => {
    const observer = new QueryObserver(queryClient, {
      ...getMeOptions(),
      enabled,
      select: (envelope) => unwrapEnvelope(envelope).locationConsent,
    });
    return {
      observer,
      unsubscribe: observer.subscribe(() => {}),
      /** 인증 상태 전이가 렌더에 반영되는 순간 */
      enable: () =>
        observer.setOptions({
          ...getMeOptions(),
          enabled: true,
          select: (envelope) => unwrapEnvelope(envelope).locationConsent,
        }),
    };
  };
  return { getMeOptions, resetSessionCache, queryClient, subscribeGate };
};

/** 게이트가 읽는 두 값(`isSuccess`·`data`)만 구조적으로 요구한다 — QueryObserver 제네릭 불필요 */
type GateObserver = {
  getCurrentResult: () => { isSuccess: boolean; data: boolean | undefined };
};

/** 화면과 같은 판정 — 관찰 결과를 게이트 표시 여부로 환산한다 */
const gateShownFor = (observer: GateObserver) => {
  const { isSuccess, data } = observer.getCurrentResult();
  return shouldShowConsentGate({
    isAuthenticated: true,
    consentKnown: isSuccess,
    locationConsent: data,
  });
};

/** 새 세션 응답이 도착할 때까지 기다린 뒤의 게이트 판정 */
const gateShownAfterSettled = async (observer: GateObserver) => {
  await vi.waitFor(() =>
    expect(observer.getCurrentResult().isSuccess).toBe(true),
  );
  return gateShownFor(observer);
};

describe("resetSessionCache — 로그인 직후 이전 세션 캐시 폐기 (AC 1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("구독 중인 게이트 옵저버는 재렌더 없이도 새 세션의 getMe 성공을 받는다 (AC 1)", async () => {
    const { resetSessionCache, queryClient, subscribeGate } =
      await arrangeGate();
    const { observer, unsubscribe } = subscribeGate(true);

    // 로그인 성공 핸들러가 하는 일 — 조회가 아직 비행 중일 때 캐시를 비운다
    void resetSessionCache(queryClient);

    expect(await gateShownAfterSettled(observer)).toBe(true);
    unsubscribe();
  });

  /**
   * 리뷰 지적(2026-08-19) — `resetQueries()`의 재조회 대상은 활성 옵저버(`enabled !== false`)다.
   * 로그인 핸들러는 `setTokens()`(스토어 동기 반영) 다음에 이 함수를 부르는데, 그 사이 React
   * 재렌더가 아직 오지 않았다면 게이트 옵저버는 `enabled:false`인 채라 재조회에서 빠진다.
   *
   * 잡는 결함은 "조회가 아예 안 나가는 것"이 아니라 **이전 세션의 동의 여부가 다음 사용자의
   * 게이트 판정에 새는 것**이다. 캐시에 앞 계정의 `locationConsent:true`가 남은 채 옵저버가
   * 켜지면, 새 조회가 끝나기 전까지 그 값이 성공 데이터로 읽혀 미동의 사용자에게 게이트가
   * 열린다 — 동의 이력이 이 화면의 존재 이유이므로 한 프레임도 허용할 수 없다. 리셋이
   * 데이터를 실제로 버리는지를 **활성화 직후 동기 시점**에 단정한다(재조회 완료를 기다리면
   * 어느 구현이든 통과해 결함이 가려진다).
   */
  it("리셋 후 활성화된 게이트 옵저버는 이전 세션의 동의 여부를 성공 데이터로 읽지 않는다 (AC 1)", async () => {
    const { getMeOptions, resetSessionCache, queryClient, subscribeGate } =
      await arrangeGate();
    // 앞 계정이 남긴 캐시 — 이 사람은 이미 동의했다
    queryClient.setQueryData(getMeOptions().queryKey, {
      developCode: 0,
      message: "ok",
      data: {
        email: null,
        nickname: "앞 계정",
        profileImageUrl: null,
        createdAt: "2026-01-01T00:00:00Z",
        locationConsent: true,
      },
    });
    // 비로그인 게이트는 enabled:false라 요청을 만들지 않는다 (AC 3)
    const { observer, unsubscribe, enable } = subscribeGate(false);

    // 로그인 성공 핸들러 — 이 시점 게이트 옵저버는 아직 비활성이다
    void resetSessionCache(queryClient);
    enable();

    // 활성화 직후: 앞 계정의 true가 성공 데이터로 남아 있으면 안 된다
    expect(observer.getCurrentResult().data).toBeUndefined();
    expect(gateShownFor(observer)).toBe(false);

    // 새 세션 응답이 도착하면 게이트가 뜬다
    expect(await gateShownAfterSettled(observer)).toBe(true);
    unsubscribe();
  });
});
