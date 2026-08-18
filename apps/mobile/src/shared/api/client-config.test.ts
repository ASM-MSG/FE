import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * AC 3: 모바일 baseUrl은 `EXPO_PUBLIC_API_BASE_URL` 직참조이고, 미설정이면 모듈 로드
 * (=앱 부트) 시점에 throw한다 — 웹 client-config 가드 동형(폴백 없음, 스펙 추정 6).
 * 가드가 없으면 undefined baseUrl이 생성 클라이언트의 명세 기본값을 덮어써
 * 상대경로 오요청으로 조용히 실패한다(웹 MSG-323 실측 결함).
 * fetch가 모바일 Ky 인스턴스인지도 함께 고정한다 — 이 주입이 "모든 호출이 모바일
 * Ky를 거친다"의 유일한 지점이다.
 */
describe("client-config baseUrl 가드 (AC 3)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("EXPO_PUBLIC_API_BASE_URL 미설정이면 모듈 로드가 즉시 실패한다", async () => {
    vi.resetModules();
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", undefined);
    await expect(import("./client-config")).rejects.toThrow(
      /EXPO_PUBLIC_API_BASE_URL/,
    );
  });

  it("설정돼 있으면 그 값이 baseUrl이 되고 fetch로 모바일 Ky 인스턴스가 주입된다", async () => {
    vi.resetModules();
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.example");
    const { createClientConfig } = await import("./client-config");
    const { httpClient } = await import("./http-client");

    const config = createClientConfig();

    expect(config.baseUrl).toBe("https://api.test.example");
    expect(config.fetch).toBe(httpClient);
  });
});
