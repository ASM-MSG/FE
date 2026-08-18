import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Storybook 번들 부트 체인 회귀 고정 (MSG-419 재작업 1회차, AC 3·10).
 *
 * `_layout.tsx`의 `if (EXPO_PUBLIC_STORYBOOK !== "1") bootstrapAuth()` 가드는 **호출만**
 * 막고 import는 막지 못한다. 정적 체인
 * `_layout → auth-session → error-interceptor → sdk → client.gen → (치환) client-config`가
 * 가드 평가보다 먼저 실행되고, expo-router는 dev(importMode: sync)에서 모든 라우트 모듈을
 * 검증차 eager 평가하므로 `app/dev/api-smoke.tsx`의 sdk 정적 import도 같은 체인을 태운다.
 * 그 결과 `.env` 없이 `EXPO_PUBLIC_STORYBOOK=1`로 띄우면 부팅이 throw로 죽었다(검증 실측).
 *
 * 이 파일은 두 방향을 동시에 고정한다:
 * - Storybook 모드: env 없이도 체인이 성립한다 (MSG-420 실행 조건 보존)
 * - Storybook 모드라도 **실 호출 경로는 미설정을 통과시키지 않는다** (AC 3의 "폴백 금지" 유지)
 * - 일반 모드: 미설정이면 같은 체인이 여전히 부트 시점에 실패한다 (AC 3 문언 유지)
 *
 * 모듈 캐시·env 전역을 케이스마다 되돌려야 해서 `client-config.test.ts`와 파일을 분리했다
 * (http-client.rn-runtime.test.ts 선례).
 */
describe("Storybook 번들 부트 체인 (AC 3·10 회귀)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("EXPO_PUBLIC_STORYBOOK=1이면 EXPO_PUBLIC_API_BASE_URL 없이도 루트 진입 체인이 throw하지 않는다", async () => {
    vi.resetModules();
    vi.stubEnv("EXPO_PUBLIC_STORYBOOK", "1");
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", undefined);

    // 루트 `_layout`과 dev 라우트가 평가하는 가장 깊은 체인 (client.gen까지 태운다)
    await expect(import("./error-interceptor")).resolves.toHaveProperty(
      "registerApiErrorInterceptor",
    );
  });

  it("Storybook 모드라도 실제 호출 경로는 미설정을 조용히 통과시키지 않는다", async () => {
    vi.resetModules();
    vi.stubEnv("EXPO_PUBLIC_STORYBOOK", "1");
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", undefined);

    const { createClientConfig } = await import("./client-config");
    const { httpClient } = await import("./http-client");

    const config = createClientConfig();

    // Ky가 아니라 실패 가드가 주입된다 — 요청이 나가는 경로 자체가 없다
    expect(config.fetch).not.toBe(httpClient);
    expect(() =>
      config.fetch?.(new Request("http://unconfigured.invalid/api/users/me")),
    ).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });

  it("Storybook 모드가 아니면 미설정 시 같은 체인이 여전히 부트 시점에 실패한다", async () => {
    vi.resetModules();
    vi.stubEnv("EXPO_PUBLIC_STORYBOOK", undefined);
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", undefined);

    await expect(import("./error-interceptor")).rejects.toThrow(
      /EXPO_PUBLIC_API_BASE_URL/,
    );
  });
});
