import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * client-config baseUrl 가드 (MSG-323 리뷰 반영).
 * 재현된 결함: env 미설정 시 `baseUrl: undefined`가 생성 클라이언트의 명세 기본값
 * (`https://api.fillmap.kr`)을 spread로 덮어쓰고, getUrl이 `(baseUrl ?? '') + path`로
 * 상대경로를 만들어 자기 origin으로 조용히 오요청 — "즉시 실패" 의도와 정반대.
 * 모듈 로드 시점 throw로 오배포를 부트스트랩에서 드러낸다.
 * env는 스텁으로 고정한다 — .env.local 유무(로컬/CI)와 무관하게 결정적이어야 한다.
 */
describe("client-config baseUrl 가드", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("VITE_API_BASE_URL 미설정이면 모듈 로드가 즉시 실패한다", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", undefined);
    await expect(import("./client-config")).rejects.toThrow(
      /VITE_API_BASE_URL/,
    );
  });

  it("설정돼 있으면 해당 값이 baseUrl로 주입된다", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_BASE_URL", "https://api.test.example");
    const { createClientConfig } = await import("./client-config");
    const config = createClientConfig();
    expect(config?.baseUrl).toBe("https://api.test.example");
  });
});
