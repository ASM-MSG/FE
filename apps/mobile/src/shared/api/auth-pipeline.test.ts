import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "../../test/envelope-response";

/**
 * 모바일 인증 파이프라인 (AC 6·7·8) — 웹 auth-pipeline.test 이식·개정.
 * 실제 httpClient(Ky 인스턴스 + 훅)를 fetch 목으로 구동한다(MSW 미도입, 웹 선례).
 * 모듈 상태(single-flight 락·설정) 격리를 위해 resetModules + 동적 import를 쓴다.
 * env 스텁은 필수다 — 재발급이 생성 SDK를 경유하고, 그 클라이언트가 모바일
 * client-config(EXPO_PUBLIC_API_BASE_URL 가드)로 초기화되기 때문이다.
 *
 * 앱 규약 차이(웹 대비): 리프레시 토큰이 쿠키가 아니라 **body**로 오가고
 * `X-Client-Type: app`을 명시하며, 회전된 refreshToken을 갱신 저장한다.
 */

const API_BASE = "https://api.test.local";

/** 401 봉투 응답 (웹 MSG-323 실측 shape) */
const unauthorizedResponse = () =>
  new Response(
    JSON.stringify({
      developCode: 2403,
      message: "인증이 필요합니다",
      data: null,
    }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  );

const loadPipeline = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { configureAuthPipeline } = await import("./auth-pipeline");
  const { httpClient } = await import("./http-client");
  return { configureAuthPipeline, httpClient };
};

type Tokens = { accessToken: string | null; refreshToken: string | null };

/** 스토어를 대신하는 테스트용 토큰 홀더 — 회전 저장까지 관찰한다 */
const configure = (
  configureAuthPipeline: Awaited<
    ReturnType<typeof loadPipeline>
  >["configureAuthPipeline"],
  initial: Tokens & { deviceId?: string | null },
) => {
  const tokens: Tokens = {
    accessToken: initial.accessToken,
    refreshToken: initial.refreshToken,
  };
  /** 세션 세대 — 스토어의 logout이 올리는 값. 여기서는 만료 처리 시 증가시킨다 */
  let sessionGeneration = 0;
  const onTokensIssued = vi.fn(async (next: Tokens) => {
    tokens.accessToken = next.accessToken;
    if (next.refreshToken !== null) tokens.refreshToken = next.refreshToken;
  });
  const onSessionExpired = vi.fn(() => {
    tokens.accessToken = null;
    tokens.refreshToken = null;
    sessionGeneration += 1;
  });
  configureAuthPipeline({
    getAccessToken: () => tokens.accessToken,
    getRefreshToken: () => tokens.refreshToken,
    getDeviceId: () => initial.deviceId ?? null,
    getSessionGeneration: () => sessionGeneration,
    onTokensIssued,
    onSessionExpired,
  });
  return { tokens, onTokensIssued, onSessionExpired };
};

const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: Request[] = [];
  /**
   * 전송 시점의 요청 본문 — 응답 후에는 body 스트림이 소모돼 clone()이 불가능하므로
   * (undici: "unusable") 목이 호출된 순간에 읽어 둔다.
   */
  const bodies: string[] = [];
  const fetchMock = vi.fn(async (input: Request) => {
    received.push(input);
    bodies.push(input.body === null ? "" : await input.clone().text());
    return route(input);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { received, bodies, fetchMock };
};

const pathnameOf = (request: Request) => new URL(request.url).pathname;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("토큰·헤더 주입 (AC 3·6)", () => {
  it("액세스 토큰이 있으면 Authorization: Bearer가 주입된다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, {
      accessToken: "stored-access-token",
      refreshToken: "stored-refresh-token",
    });
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.get(`${API_BASE}/api/videos`);

    expect(received).toHaveLength(1);
    expect(received[0].headers.get("Authorization")).toBe(
      "Bearer stored-access-token",
    );
  });

  it("토큰이 없으면 Authorization 헤더가 아예 붙지 않는다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, {
      accessToken: null,
      refreshToken: null,
    });
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.get(`${API_BASE}/api/videos`);

    expect(received[0].headers.get("Authorization")).toBeNull();
  });

  it("저장된 디바이스 식별자를 요청에 싣고, 로그아웃에는 싣지 않는다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, {
      accessToken: "stored-access-token",
      refreshToken: "stored-refresh-token",
      deviceId: "device-abc",
    });
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.get(`${API_BASE}/api/videos`);
    await httpClient.post(`${API_BASE}/api/auth/logout`);

    expect(received[0].headers.get("X-Device-Id")).toBe("device-abc");
    expect(received[1].headers.get("X-Device-Id")).toBeNull();
  });

  it.each([
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/reissue",
    "/api/auth/dev/social-login",
    "/api/auth/oauth/kakao",
  ])("%s 요청에는 저장 토큰이 주입되지 않는다", async (path) => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    configure(configureAuthPipeline, {
      accessToken: "stale-token",
      refreshToken: "stored-refresh-token",
    });
    const { received } = stubFetch(() => envelopeResponse({ ok: true }));

    await httpClient.post(`${API_BASE}${path}`, { json: {} });

    expect(received[0].headers.get("Authorization")).toBeNull();
  });
});

describe("401 재발급 후 1회 재시도 (AC 6)", () => {
  it("보호 API 401 → reissue(body refreshToken + X-Client-Type: app) → 회전 토큰 저장 → 원 요청 정확히 1회 재시도", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    const { tokens, onTokensIssued, onSessionExpired } = configure(
      configureAuthPipeline,
      { accessToken: "stale-token", refreshToken: "stored-refresh-token" },
    );

    let protectedCalls = 0;
    const { received, bodies } = stubFetch((request) => {
      if (pathnameOf(request) === "/api/auth/reissue") {
        return envelopeResponse({
          accessToken: "reissued-token",
          refreshToken: "rotated-refresh-token",
        });
      }
      protectedCalls += 1;
      return protectedCalls === 1
        ? unauthorizedResponse()
        : envelopeResponse({ retried: true });
    });

    const response = await httpClient.get(`${API_BASE}/api/videos`);

    expect(received.map(pathnameOf)).toEqual([
      "/api/videos",
      "/api/auth/reissue",
      "/api/videos",
    ]);
    expect(received[1].headers.get("X-Client-Type")).toBe("app");
    expect(JSON.parse(bodies[1])).toEqual({
      refreshToken: "stored-refresh-token",
    });
    expect(onTokensIssued).toHaveBeenCalledExactlyOnceWith(
      { accessToken: "reissued-token", refreshToken: "rotated-refresh-token" },
      // 재발급을 시작한 세션 세대 — 수신 측이 이 세대의 유효성으로 적용 여부를 판정한다
      0,
    );
    // 회전된 리프레시 토큰이 갱신 저장된다 — 옛 토큰 재사용은 세션 체인 폐기 사유
    expect(tokens.refreshToken).toBe("rotated-refresh-token");
    expect(received[2].headers.get("Authorization")).toBe(
      "Bearer reissued-token",
    );
    expect(response.status).toBe(200);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("동시 다발 401에도 reissue는 1회만 발생하고 대기 요청들이 같은 토큰으로 재시도한다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    const { onTokensIssued } = configure(configureAuthPipeline, {
      accessToken: "stale-token",
      refreshToken: "stored-refresh-token",
    });

    const callsByPath = new Map<string, number>();
    const { received } = stubFetch(async (request) => {
      const path = pathnameOf(request);
      const count = (callsByPath.get(path) ?? 0) + 1;
      callsByPath.set(path, count);
      if (path === "/api/auth/reissue") {
        await new Promise((resolve) => setTimeout(resolve, 0));
        return envelopeResponse({
          accessToken: "reissued-token",
          refreshToken: "rotated-refresh-token",
        });
      }
      return count === 1 ? unauthorizedResponse() : envelopeResponse({ path });
    });

    const [responseA, responseB] = await Promise.all([
      httpClient.get(`${API_BASE}/api/cells`),
      httpClient.get(`${API_BASE}/api/dex`),
    ]);

    expect(callsByPath.get("/api/auth/reissue")).toBe(1);
    expect(onTokensIssued).toHaveBeenCalledTimes(1);
    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    const retries = received.filter(
      (request) =>
        pathnameOf(request) !== "/api/auth/reissue" &&
        request.headers.get("Authorization") === "Bearer reissued-token",
    );
    expect(retries.map(pathnameOf).sort()).toEqual(["/api/cells", "/api/dex"]);
  });
});

describe("익명 401 무개입 (AC 8)", () => {
  it("저장 refreshToken이 없으면 재발급도 로그인 이동도 트리거하지 않고 원 401을 그대로 반환한다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    const { onTokensIssued, onSessionExpired } = configure(
      configureAuthPipeline,
      { accessToken: null, refreshToken: null },
    );
    const { received } = stubFetch(() => unauthorizedResponse());

    const response = await httpClient.get(`${API_BASE}/api/cells`);

    expect(received.map(pathnameOf)).toEqual(["/api/cells"]);
    expect(response.status).toBe(401);
    expect(onTokensIssued).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

describe("auth 엔드포인트 401 제외 (무한 루프 방지)", () => {
  it.each([
    "/api/auth/login",
    "/api/auth/reissue",
    "/api/auth/dev/social-login",
    "/api/auth/oauth/kakao",
  ])("%s의 401은 재발급을 트리거하지 않고 그대로 반환된다", async (path) => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    const { onSessionExpired } = configure(configureAuthPipeline, {
      accessToken: "stale-token",
      refreshToken: "stored-refresh-token",
    });
    const { received } = stubFetch(() => unauthorizedResponse());

    const response = await httpClient.post(`${API_BASE}${path}`, { json: {} });

    expect(received.map(pathnameOf)).toEqual([path]);
    expect(response.status).toBe(401);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

describe("재발급 실패 = 세션 만료 (AC 7)", () => {
  it("reissue가 실패하면 세션 만료 처리가 호출되고 원 401이 추가 재시도 없이 반환된다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    const { onTokensIssued, onSessionExpired } = configure(
      configureAuthPipeline,
      { accessToken: "stale-token", refreshToken: "expired-refresh-token" },
    );
    const { received } = stubFetch((request) =>
      pathnameOf(request) === "/api/auth/reissue"
        ? new Response(null, { status: 401 })
        : unauthorizedResponse(),
    );

    const response = await httpClient.get(`${API_BASE}/api/videos`);

    expect(received.map(pathnameOf)).toEqual([
      "/api/videos",
      "/api/auth/reissue",
    ]);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(onTokensIssued).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it("재발급 성공 후 재시도도 401이면 세션 만료 처리가 호출되고 추가 재시도는 없다", async () => {
    const { configureAuthPipeline, httpClient } = await loadPipeline();
    const { onSessionExpired } = configure(configureAuthPipeline, {
      accessToken: "stale-token",
      refreshToken: "stored-refresh-token",
    });
    const { received } = stubFetch((request) =>
      pathnameOf(request) === "/api/auth/reissue"
        ? envelopeResponse({
            accessToken: "reissued-token",
            refreshToken: "rotated-refresh-token",
          })
        : unauthorizedResponse(),
    );

    const response = await httpClient.get(`${API_BASE}/api/videos`);

    expect(received.map(pathnameOf)).toEqual([
      "/api/videos",
      "/api/auth/reissue",
      "/api/videos",
    ]);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(401);
  });
});
