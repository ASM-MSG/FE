import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "../../test/envelope-response";

/**
 * 스펙 리스크 1(ky 2.x의 RN 호환) 조기 확증 — RN(Hermes + whatwg-fetch)에는
 * `AbortSignal.any`가 없다. ky는 이런 전역을 **모듈 로드 시점에 한 번** feature-detect하므로
 * (constants.js), 검증하려면 ky가 처음 import되기 전에 전역을 지워야 한다.
 * 그래서 이 케이스만 별도 파일로 둔다 — vitest는 파일 단위로 워커를 격리하고,
 * node_modules 모듈은 `vi.resetModules()`로 되돌아가지 않기 때문이다(실측).
 * 아래 테스트가 통과하면 "AbortSignal.any 없는 런타임에서도 생성 SDK → 모바일 Ky →
 * 401 재발급 → 재시도"가 성립한다.
 *
 * `ReadableStream` 부재는 node(undici)가 Response 생성 자체에 그 전역을 요구해 러너에서
 * 재현할 수 없다 — ky의 같은 feature-detect 경로(supportsRequestStreams·
 * supportsResponseStreams)에 의존하며, 실기 확증은 dev client 스모크 몫이다.
 */

const API_BASE = "https://api.test.local";
const originalAbortSignalAny = AbortSignal.any;

beforeAll(() => {
  // @ts-expect-error RN 전역 부재 재현 — ky import보다 먼저 지워야 의미가 있다
  delete AbortSignal.any;
});

afterAll(() => {
  AbortSignal.any = originalAbortSignalAny;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("RN 런타임 제약에서의 동작 (스펙 리스크 1)", () => {
  it("AbortSignal.any가 없어도 401 재발급과 원 요청 1회 재시도가 동작한다", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
    const { configureAuthPipeline } = await import("./auth-pipeline");
    const { httpClient } = await import("./http-client");
    configureAuthPipeline({
      getAccessToken: () => "stale-token",
      getRefreshToken: () => "stored-refresh-token",
      getDeviceId: () => null,
      getSessionGeneration: () => 0,
      onTokensIssued: vi.fn(async () => {}),
      onSessionExpired: vi.fn(),
    });

    const received: string[] = [];
    let protectedCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        const { pathname } = new URL(request.url);
        received.push(pathname);
        if (pathname === "/api/auth/reissue") {
          return envelopeResponse({
            accessToken: "reissued-token",
            refreshToken: "rotated-refresh-token",
          });
        }
        protectedCalls += 1;
        return protectedCalls === 1
          ? new Response(
              JSON.stringify({
                developCode: 2403,
                message: "인증이 필요합니다",
                data: null,
              }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            )
          : envelopeResponse({ retried: true });
      }),
    );

    const response = await httpClient.get(`${API_BASE}/api/videos`);

    expect(received).toEqual([
      "/api/videos",
      "/api/auth/reissue",
      "/api/videos",
    ]);
    expect(response.status).toBe(200);
  });
});
