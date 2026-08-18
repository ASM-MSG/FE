import { afterEach, describe, expect, it, vi } from "vitest";
import { errorEnvelope } from "../../test/envelope-response";

/**
 * AC 2·3·4: 생성 SDK를 모바일 barrel로 호출하면 (1) 요청이 모바일 Ky·baseUrl을 거치고
 * (2) 실패가 정규화된 ApiError로 화면(쿼리 error)까지 전파되는지를 한 흐름으로 고정한다.
 * 인터셉터는 생성 client "값"에 등록되므로 모듈 상태 격리를 위해 resetModules를 쓴다.
 */

const API_BASE = "https://api.test.local";

const loadApi = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { registerApiErrorInterceptor } = await import("./error-interceptor");
  const { ApiError } = await import("./api-error");
  const { getMe } = await import("./sdk");
  registerApiErrorInterceptor();
  return { ApiError, getMe };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("생성 SDK 호출 경로 (AC 2·3)", () => {
  it("모바일 barrel의 SDK 호출이 EXPO_PUBLIC_API_BASE_URL 기준 절대 URL로 나간다", async () => {
    const { getMe } = await loadApi();
    const received: Request[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        received.push(request);
        return new Response(
          JSON.stringify({ developCode: 0, message: "ok", data: {} }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    await getMe();

    expect(received[0].url).toBe(`${API_BASE}/api/users/me`);
  });
});

describe("에러 정규화 전파 (AC 4·9)", () => {
  it("에러 봉투 응답이 status·developCode를 가진 ApiError로 전파된다", async () => {
    const { ApiError, getMe } = await loadApi();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorEnvelope(1500, "서버 오류", 500)),
    );

    const error = await getMe({ throwOnError: true }).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 500,
      developCode: 1500,
      message: "서버 오류",
    });
  });

  it("네트워크 실패는 status 없는 ApiError로 전파된다 — 화면이 실패 상태를 그릴 수 있다", async () => {
    const { ApiError, getMe } = await loadApi();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new TypeError("Network request failed");
      }),
    );

    const error = await getMe({ throwOnError: true }).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as InstanceType<typeof ApiError>).status).toBeUndefined();
  });
});
