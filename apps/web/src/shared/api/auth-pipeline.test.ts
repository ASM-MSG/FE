import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";

/**
 * 인증 파이프라인 (MSG-324 수용 기준 1~6, test-first).
 * 실제 httpClient(Ky 인스턴스 + 훅)를 fetch 목으로 구동한다 — MSW 미도입
 * (단순성 우선, api-error.test 목 선례 준수). 모듈 상태(single-flight 락·설정)를
 * 케이스마다 격리하기 위해 resetModules + 동적 import를 쓴다 (client-config.test 선례).
 * env는 스텁으로 고정 — reissue가 생성 SDK(client-config env 가드)를 경유하기 때문.
 * 단정은 pathname 기준이라 baseUrl 값 자체에는 의존하지 않는다.
 */

const API_BASE = "https://api.test.local";

/** 401 봉투 응답 (MSG-323 실측 shape) */
const unauthorizedResponse = () =>
  new Response(
    JSON.stringify({
      developCode: 2403,
      message: "인증이 필요합니다",
      data: null,
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );

/** 파이프라인 대상 모듈을 새 레지스트리로 로드한다 — single-flight 락 등 모듈 상태 격리 */
const loadPipeline = async () => {
  vi.stubEnv("VITE_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { configureAuthPipeline } = await import("./auth-pipeline");
  const { httpClient } = await import("./http-client");
  return { configureAuthPipeline, httpClient };
};

type PipelineCallbacks = {
  onTokenRefreshed: ReturnType<typeof vi.fn>;
  onSessionExpired: ReturnType<typeof vi.fn>;
};

const configure = (
  configureAuthPipeline: Awaited<
    ReturnType<typeof loadPipeline>
  >["configureAuthPipeline"],
  getAccessToken: () => string | null,
): PipelineCallbacks => {
  const onTokenRefreshed = vi.fn();
  const onSessionExpired = vi.fn();
  configureAuthPipeline({ getAccessToken, onTokenRefreshed, onSessionExpired });
  return { onTokenRefreshed, onSessionExpired };
};

/** fetch 목이 받은 Request들 (호출 순서대로) */
const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: Request[] = [];
  const fetchMock = vi.fn(async (input: Request) => {
    received.push(input);
    return route(input);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { received, fetchMock };
};

const pathnameOf = (request: Request) => new URL(request.url).pathname;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("X-Device-Id 재사용 (MSG-325)", () => {
  it("저장된 디바이스 식별자를 요청에 싣는다 — 재발급이 같은 디바이스 세션을 갱신하도록", async () => {
    const { deviceIdStorage } = await import("../storage");
    deviceIdStorage.save("device-abc");
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, () => "stored-access-token");
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.get(`${API_BASE}/api/videos`);

    expect(received[0].headers.get("X-Device-Id")).toBe("device-abc");
    deviceIdStorage.clear();
  });

  it("재발급에도 붙인다 — auth 엔드포인트 토큰 미주입과 별개다", async () => {
    const { deviceIdStorage } = await import("../storage");
    deviceIdStorage.save("device-abc");
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, () => "stored-access-token");
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.post(`${API_BASE}/api/auth/reissue`);

    expect(received[0].headers.get("X-Device-Id")).toBe("device-abc");
    expect(received[0].headers.get("Authorization")).toBeNull();
    deviceIdStorage.clear();
  });

  it("로그아웃에는 붙이지 않는다 — 전 디바이스 세션 삭제가 확정 동작이다 (MSG-324 추정 4)", async () => {
    const { deviceIdStorage } = await import("../storage");
    deviceIdStorage.save("device-abc");
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, () => "stored-access-token");
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.post(`${API_BASE}/api/auth/logout`);

    expect(received[0].headers.get("X-Device-Id")).toBeNull();
    expect(received[0].headers.get("Authorization")).toBe(
      "Bearer stored-access-token",
    );
    deviceIdStorage.clear();
  });

  it("저장된 값이 없으면 헤더가 아예 붙지 않는다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, () => "stored-access-token");
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.get(`${API_BASE}/api/videos`);

    expect(received[0].headers.get("X-Device-Id")).toBeNull();
  });
});

describe("토큰 주입 (기준 1) · credentials (기준 6)", () => {
  it("액세스 토큰이 있으면 모든 요청에 Authorization: Bearer가 주입되고, credentials는 include다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, () => "stored-access-token");
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.get(`${API_BASE}/api/videos`);

    expect(received).toHaveLength(1);
    expect(received[0].headers.get("Authorization")).toBe(
      "Bearer stored-access-token",
    );
    expect(received[0].credentials).toBe("include");
  });

  it("토큰이 없으면 Authorization 헤더가 아예 붙지 않는다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, () => null);
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.get(`${API_BASE}/api/videos`);

    expect(received[0].headers.get("Authorization")).toBeNull();
    expect(received[0].credentials).toBe("include");
  });
});

describe("auth 엔드포인트 토큰 미주입 (기준 1 — 실서버 회귀)", () => {
  /**
   * 재발급이 필요한 시점의 액세스 토큰은 정의상 무효다. 그런데 서버는 reissue에
   * Authorization이 붙어 있으면 그 토큰을 검증해 401(2401)로 거부한다 — 실서버 실측:
   * 헤더 없음 200 / 무효 토큰 401 2401 / 유효 토큰 200. 즉 헤더를 붙이면 재발급이
   * 필요한 바로 그 순간에만 실패한다. afterResponse의 제외 목록과 대칭을 맞춘다.
   */
  it.each([
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/reissue",
    "/api/auth/dev/social-login",
    // provider가 경로 파라미터 — 정확 일치가 아니라 접두사로 걸러야 한다
    "/api/auth/oauth/kakao",
  ])("%s 요청에는 저장 토큰이 주입되지 않는다", async (path) => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, () => "stale-token");
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.post(`${API_BASE}${path}`, { json: {} });

    expect(received[0].headers.get("Authorization")).toBeNull();
    // 쿠키 리프레시 토큰은 계속 실려야 한다 (기준 6)
    expect(received[0].credentials).toBe("include");
  });

  /**
   * 공개 엔드포인트(비로그인 셀프 신청)도 미주입 대상이다 — 요청이 정의상 비인증인데
   * 남아 있는 stale 토큰이 붙으면 서버가 그 토큰을 검증해 401을 내고, 공개 화면에서
   * 세션 만료 처리(로그인 모달)가 발화한다 (MSG-543 codex P1).
   */
  it("공개 엔드포인트(/api/org-account-requests)에는 저장 토큰이 주입되지 않는다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, () => "stale-token");
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.post(`${API_BASE}/api/org-account-requests`, { json: {} });

    expect(received[0].headers.get("Authorization")).toBeNull();
  });

  it("공개 엔드포인트의 401은 재발급·세션 만료 처리를 트리거하지 않는다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    const { onSessionExpired } = configure(
      configureAuthPipeline,
      () => "stale-token",
    );
    const { received } = stubFetch(() => unauthorizedResponse());

    const response = await httpClient
      .post(`${API_BASE}/api/org-account-requests`, {
        json: {},
        throwHttpErrors: false,
      })
      .then((r) => r);

    expect(response.status).toBe(401);
    // reissue 왕복 없이 원 401이 그대로 반환된다
    expect(received.map(pathnameOf)).toEqual(["/api/org-account-requests"]);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  /**
   * logout은 계약상 Authorization이 필수라 제외 목록에 없다 — 의도된 비대칭이다.
   * 제외 목록에 logout을 추가하면 이 단정이 깨지며 알린다.
   */
  it("logout은 Authorization이 필수이므로 계속 주입된다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, () => "stored-access-token");
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.post(`${API_BASE}/api/auth/logout`, { json: {} });

    expect(received[0].headers.get("Authorization")).toBe(
      "Bearer stored-access-token",
    );
  });
});

describe("401 재발급 후 1회 재시도 (기준 2)", () => {
  it("보호 API 401 → reissue(X-Client-Type: web) → 새 토큰 스토어 반영 → 원요청 1회 재시도 응답이 반환된다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    let token: string | null = "stale-token";
    const { onTokenRefreshed, onSessionExpired } = configure(
      configureAuthPipeline,
      () => token,
    );
    onTokenRefreshed.mockImplementation((next: string) => {
      token = next;
    });

    let protectedCalls = 0;
    const { received } = stubFetch((request) => {
      if (pathnameOf(request) === "/api/auth/reissue") {
        return envelopeResponse({
          accessToken: "reissued-token",
          refreshToken: null,
        });
      }
      protectedCalls += 1;
      return protectedCalls === 1
        ? unauthorizedResponse()
        : envelopeResponse({ retried: true });
    });

    const response = await httpClient.get(`${API_BASE}/api/videos`);

    // 호출 순서: 원요청(401) → reissue → 원요청 재시도
    expect(received.map(pathnameOf)).toEqual([
      "/api/videos",
      "/api/auth/reissue",
      "/api/videos",
    ]);
    // reissue는 X-Client-Type: web 명시 (추정 6)
    expect(received[1].headers.get("X-Client-Type")).toBe("web");
    // 새 토큰이 스토어 콜백으로 반영되고, 재시도는 새 토큰을 싣는다
    expect(onTokenRefreshed).toHaveBeenCalledExactlyOnceWith("reissued-token");
    expect(received[2].headers.get("Authorization")).toBe(
      "Bearer reissued-token",
    );
    // 재시도 응답이 호출자에게 반환된다
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      developCode: 0,
      message: "ok",
      data: { retried: true },
    });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

describe("동시 401 single-flight (기준 3)", () => {
  it("동시 다발 401에도 reissue는 1회만 발생하고, 대기 요청들은 같은 결과로 각자 재시도한다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    let token: string | null = "stale-token";
    const { onTokenRefreshed } = configure(configureAuthPipeline, () => token);
    onTokenRefreshed.mockImplementation((next: string) => {
      token = next;
    });

    const callsByPath = new Map<string, number>();
    const { received } = stubFetch(async (request) => {
      const path = pathnameOf(request);
      const count = (callsByPath.get(path) ?? 0) + 1;
      callsByPath.set(path, count);
      if (path === "/api/auth/reissue") {
        // 매크로태스크 지연 — 두 401의 afterResponse가 모두 락에 합류한 뒤 재발급이 완료되게 한다
        await new Promise((resolve) => setTimeout(resolve, 0));
        return envelopeResponse({
          accessToken: "reissued-token",
          refreshToken: null,
        });
      }
      return count === 1 ? unauthorizedResponse() : envelopeResponse({ path });
    });

    const [responseA, responseB] = await Promise.all([
      httpClient.get(`${API_BASE}/api/cells`),
      httpClient.get(`${API_BASE}/api/dex`),
    ]);

    expect(callsByPath.get("/api/auth/reissue")).toBe(1);
    expect(onTokenRefreshed).toHaveBeenCalledTimes(1);
    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    // 두 재시도 모두 같은 재발급 토큰을 싣는다
    const retries = received.filter(
      (request) =>
        pathnameOf(request) !== "/api/auth/reissue" &&
        request.headers.get("Authorization") === "Bearer reissued-token",
    );
    expect(retries.map(pathnameOf).sort()).toEqual(["/api/cells", "/api/dex"]);
  });
});

describe("auth 엔드포인트 401 제외 (기준 4)", () => {
  it.each([
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/reissue",
    "/api/auth/dev/social-login",
    // 실 소셜 로그인 — 401(2421 id_token 검증 실패 등)은 로그인 실패지 세션 만료가 아니다
    "/api/auth/oauth/kakao",
  ])("%s의 401은 재발급을 트리거하지 않고 그대로 반환된다", async (path) => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    const { onSessionExpired } = configure(
      configureAuthPipeline,
      () => "stale-token",
    );
    const { received } = stubFetch(() => unauthorizedResponse());

    const response = await httpClient.post(`${API_BASE}${path}`, {
      json: {},
    });

    // 재발급·재시도 없이 단일 호출로 끝난다 (무한 루프 방지)
    expect(received.map(pathnameOf)).toEqual([path]);
    expect(response.status).toBe(401);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

describe("재발급 실패 = 세션 만료 (기준 5)", () => {
  it("reissue가 에러면 세션 만료 처리가 호출되고 원 401이 추가 재시도 없이 반환된다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    const { onTokenRefreshed, onSessionExpired } = configure(
      configureAuthPipeline,
      () => "stale-token",
    );
    const { received } = stubFetch((request) =>
      pathnameOf(request) === "/api/auth/reissue"
        ? new Response(null, { status: 500 })
        : unauthorizedResponse(),
    );

    const response = await httpClient.get(`${API_BASE}/api/videos`);

    // 원요청 + reissue 뿐 — 재시도 없음
    expect(received.map(pathnameOf)).toEqual([
      "/api/videos",
      "/api/auth/reissue",
    ]);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(onTokenRefreshed).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it("재발급 성공 후 재시도도 401이면 세션 만료 처리가 호출되고 추가 재시도는 없다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    let token: string | null = "stale-token";
    const { onTokenRefreshed, onSessionExpired } = configure(
      configureAuthPipeline,
      () => token,
    );
    onTokenRefreshed.mockImplementation((next: string) => {
      token = next;
    });

    const { received } = stubFetch((request) =>
      pathnameOf(request) === "/api/auth/reissue"
        ? envelopeResponse({
            accessToken: "reissued-token",
            refreshToken: null,
          })
        : unauthorizedResponse(),
    );

    const response = await httpClient.get(`${API_BASE}/api/videos`);

    // 원요청(401) → reissue → 재시도(401)에서 종료 — 두 번째 재발급 루프 없음
    expect(received.map(pathnameOf)).toEqual([
      "/api/videos",
      "/api/auth/reissue",
      "/api/videos",
    ]);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });
});

/**
 * 리뷰 반영 — 재시도 fetch가 던지는 경우의 의미론을 고정한다.
 * 제안된 "throw 시 onSessionExpired" 는 채택하지 않는다: 이 시점엔 재발급이 이미
 * 성공해 새 토큰이 저장된 상태라 세션은 유효하다. 취소(언마운트)나 일시적 네트워크
 * 장애로 로그아웃시키면 오히려 해롭다. 오류를 그대로 전파해 취소는 Query가 취소로,
 * 네트워크 오류는 shouldRetryQuery의 재시도 대상으로 다루게 둔다.
 */
describe("재시도 fetch 실패 시 의미론 (리뷰 반영)", () => {
  it.each([
    ["네트워크 장애", () => new TypeError("Failed to fetch")],
    ["요청 취소", () => new DOMException("Aborted", "AbortError")],
  ])(
    "%s로 재시도가 실패하면 오류가 전파되고 세션 만료 처리는 하지 않는다",
    async (_label, makeError) => {
      const { configureAuthPipeline, httpClient } = await loadPipeline();
      let token: string | null = "stale-token";
      const { onTokenRefreshed, onSessionExpired } = configure(
        configureAuthPipeline,
        () => token,
      );
      onTokenRefreshed.mockImplementation((next: string) => {
        token = next;
      });

      let protectedCalls = 0;
      stubFetch((request) => {
        if (pathnameOf(request) === "/api/auth/reissue") {
          return envelopeResponse({
            accessToken: "reissued-token",
            refreshToken: null,
          });
        }
        protectedCalls += 1;
        if (protectedCalls === 1) return unauthorizedResponse();
        throw makeError();
      });

      await expect(httpClient.get(`${API_BASE}/api/videos`)).rejects.toThrow();
      // 재발급은 성공했다 = 세션은 유효하다. 만료 처리는 하지 않는다
      expect(onTokenRefreshed).toHaveBeenCalledExactlyOnceWith(
        "reissued-token",
      );
      expect(onSessionExpired).not.toHaveBeenCalled();
    },
  );
});
