import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "../../../test/envelope-response";

/**
 * 기준 24·25·26: "업로드하기"가 `purpose` 미전송 presign → 전역 fetch PUT →
 * `POST /api/videos`를 순서대로 발사하고, S3 PUT은 앱 httpClient(ky)를 경유하지 않는다.
 * 선분석은 같은 단계열을 `purpose=HIGHLIGHT_PREVIEW`로 밟는다(기준 23).
 *
 * 네트워크 경계에서 한 번만 목한다 — 생성 SDK 호출은 모바일 client-config → Ky →
 * 전역 fetch로 내려오고, S3 PUT은 Ky를 건너뛰고 같은 전역 fetch로 나간다.
 * 그래서 이 한 스텁이 두 경로의 계약을 동시에 관찰한다.
 * 인터셉터·client는 모듈 상태라 resetModules로 격리한다 (error-interceptor.test 관례).
 */
const API_BASE = "https://api.test.local";

const loadEffects = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const module = await import("./upload-effects");
  const orchestration = await import("../model/upload-orchestration");
  return { ...module, ...orchestration };
};

interface Observed {
  method: string;
  url: string;
  headers: Headers;
  body?: unknown;
}

const stubFetch = (
  respond: (observed: Observed) => Response | Promise<Response>,
) => {
  const observed: Observed[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      // 생성 SDK 경로는 Request 객체로, S3 PUT·파일 읽기는 (url, init) 쌍으로 도착한다
      const isRequest =
        typeof Request !== "undefined" && input instanceof Request;
      const url = isRequest ? input.url : String(input);
      const method = isRequest ? input.method : (init?.method ?? "GET");
      const headers = isRequest
        ? input.headers
        : new Headers(init?.headers as HeadersInit | undefined);
      const body = isRequest
        ? ((await input.clone().json()) as unknown)
        : init?.body;
      const call = { method, url, headers, body };
      observed.push(call);
      return respond(call);
    }),
  );
  return observed;
};

const respondUpload = (call: Observed): Response => {
  if (call.url.startsWith("file://")) {
    return new Response(new Blob(["video-bytes"]), { status: 200 });
  }
  if (call.url.includes("/api/videos/presigned-url")) {
    return envelopeResponse({
      uploadUrl: "https://bucket.s3.example.com/key?sig=abc",
      s3Key: "videos/clip.mp4",
      expiresInSec: 300,
    });
  }
  if (call.url.includes("/api/videos/highlight-preview")) {
    return envelopeResponse({ highlights: [[3, 8]] });
  }
  if (call.url.startsWith("https://bucket.s3.example.com")) {
    return new Response(null, { status: 200 });
  }
  return envelopeResponse({ videoId: 7, gridId: "16858_11420" });
};

const confirmInput = {
  uri: "file:///clip.mp4",
  fileName: "clip.mp4",
  fileSize: 2048,
  contentType: "video/mp4",
  lat: 35.1579,
  lng: 129.0594,
  durationSec: 5,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("buildConfirmEffects — 업로드 확정 단계열 (기준 24·25·26)", () => {
  it("presign → S3 PUT → POST /api/videos 순서로 발사한다 (기준 24)", async () => {
    const { buildConfirmEffects, createOrchestration, runUploadFlow } =
      await loadEffects();
    const observed = stubFetch(respondUpload);

    await runUploadFlow(
      createOrchestration(),
      buildConfirmEffects(confirmInput),
    );

    expect(
      observed.map((call) => `${call.method} ${new URL(call.url).pathname}`),
    ).toEqual([
      "POST /api/videos/presigned-url",
      "GET /clip.mp4",
      "PUT /key",
      "POST /api/videos",
    ]);
  });

  it("확정 presign은 purpose를 보내지 않는다 — 서버 기본값 UPLOAD (기준 24)", async () => {
    const { buildConfirmEffects, createOrchestration, runUploadFlow } =
      await loadEffects();
    const observed = stubFetch(respondUpload);

    await runUploadFlow(
      createOrchestration(),
      buildConfirmEffects(confirmInput),
    );

    const presign = observed[0].body as Record<string, unknown>;
    expect(presign).toMatchObject({
      extension: "mp4",
      contentType: "video/mp4",
      contentLength: 2048,
    });
    expect(presign.purpose).toBeUndefined();
  });

  it("S3 PUT에 Authorization·X-Client-Type 헤더가 실리지 않는다 — httpClient 미경유 (기준 24)", async () => {
    const { buildConfirmEffects, createOrchestration, runUploadFlow } =
      await loadEffects();
    const observed = stubFetch(respondUpload);

    await runUploadFlow(
      createOrchestration(),
      buildConfirmEffects(confirmInput),
    );

    const put = observed.find((call) => call.method === "PUT")!;
    expect(put.headers.get("Authorization")).toBeNull();
    expect(put.headers.get("X-Client-Type")).toBeNull();
    expect(put.headers.get("Content-Type")).toBe("video/mp4");
  });

  it("확정 body가 s3Key·좌표·선택 구간 길이·촬영 시각을 싣는다 (기준 25·26)", async () => {
    const { buildConfirmEffects, createOrchestration, runUploadFlow } =
      await loadEffects();
    const observed = stubFetch(respondUpload);

    await runUploadFlow(
      createOrchestration(),
      buildConfirmEffects(confirmInput),
    );

    const body = observed.at(-1)!.body as Record<string, unknown>;
    expect(body).toMatchObject({
      s3Key: "videos/clip.mp4",
      lat: 35.1579,
      lng: 129.0594,
      durationSec: 5,
    });
    expect(typeof body.recordedAt).toBe("string");
  });
});

describe("buildAnalyzeEffects — 선분석 단계열 (기준 23)", () => {
  it("선분석 presign은 purpose=HIGHLIGHT_PREVIEW를 보내고 highlight-preview로 확정한다 (기준 23)", async () => {
    const { buildAnalyzeEffects, createOrchestration, runUploadFlow } =
      await loadEffects();
    const observed = stubFetch(respondUpload);

    const { result } = await runUploadFlow(
      createOrchestration(),
      buildAnalyzeEffects({
        uri: "file:///clip.mp4",
        fileName: "clip.mov",
        fileSize: 4096,
        contentType: "video/quicktime",
      }),
    );

    expect(observed[0].body).toMatchObject({
      extension: "mov",
      contentType: "video/quicktime",
      contentLength: 4096,
      purpose: "HIGHLIGHT_PREVIEW",
    });
    expect(observed.at(-1)!.url).toContain("/api/videos/highlight-preview");
    expect(result).toEqual([[3, 8]]);
  });

  /**
   * 응답이 오지 않는 요청을 걸어 두고 가짜 타이머를 밀어 **실제 만료 시각**을 관측한다.
   * 상수 비교와 인스턴스 비교만으로는 `.extend({})`(연장 누락)도 통과해 R4의 방어선이
   * 되지 못한다(검증 지적 6). ky의 타임아웃은 setTimeout 기반이라 가짜 타이머로 구동된다.
   */
  const raceTimeout = (client: (url: string) => Promise<unknown>) => {
    let outcome: unknown = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>(() => {
            /* 응답 없음 — 타임아웃만 관측한다 */
          }),
      ),
    );
    const settled = client("https://api.test.local/api/videos/x").then(
      () => {
        outcome = "resolved";
      },
      (error: unknown) => {
        outcome = error;
      },
    );
    return { outcome: () => outcome, settled };
  };

  it("앱 기본 Ky는 10초에 끊긴다 — 선분석(동기 5~30초)에 그대로 쓸 수 없다는 전제 (R4)", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
    vi.resetModules();
    vi.useFakeTimers();
    const { httpClient } = await import("../../../shared/api/http-client");

    const race = raceTimeout((url) => httpClient(url));
    await vi.advanceTimersByTimeAsync(11_000);
    await race.settled;

    expect((race.outcome() as Error).name).toBe("TimeoutError");
    vi.useRealTimers();
  });

  it("선분석 클라이언트는 30초가 지나도 살아 있고 120초에 만료된다 — 연장이 실제로 걸려 있어야 정상 분석이 통과한다 (R4)", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
    vi.resetModules();
    vi.useFakeTimers();
    const { ANALYSIS_TIMEOUT_MS, analysisHttpClient } =
      await import("./upload-effects");

    const race = raceTimeout((url) => analysisHttpClient(url));
    // 서버 동기 응답 5~30초(부하 시 3배) — 이 구간에서 끊기면 정상 분석이 항상 실패한다
    await vi.advanceTimersByTimeAsync(30_000);
    expect(race.outcome()).toBeNull();

    await vi.advanceTimersByTimeAsync(ANALYSIS_TIMEOUT_MS);
    await race.settled;

    expect((race.outcome() as Error).name).toBe("TimeoutError");
    vi.useRealTimers();
  });
});

/**
 * AC 9 (D12): 행사 모드 확정은 `POST /api/event-occurrences/{id}/locations/{id}/videos`로
 * path 귀속하고 body는 `s3Key·durationSec·recordedAt` 3필드뿐이다(좌표 없음).
 * presign 단계는 일반 확정과 같다(purpose 미전송 = UPLOAD).
 */
const eventConfirmInput = {
  uri: "file:///clip.mp4",
  fileName: "clip.mp4",
  fileSize: 2048,
  contentType: "video/mp4",
  durationSec: 5,
  event: { occurrenceId: 5, locationId: 11 },
};

describe("buildConfirmEffects — 행사 귀속 확정 단계열 (AC 9·D12)", () => {
  it("확정 요청이 행사 위치 경로로 나간다", async () => {
    const { buildConfirmEffects, createOrchestration, runUploadFlow } =
      await loadEffects();
    const observed = stubFetch(respondUpload);

    await runUploadFlow(
      createOrchestration(),
      buildConfirmEffects(eventConfirmInput),
    );

    expect(
      observed.map((call) => `${call.method} ${new URL(call.url).pathname}`),
    ).toEqual([
      "POST /api/videos/presigned-url",
      "GET /clip.mp4",
      "PUT /key",
      "POST /api/event-occurrences/5/locations/11/videos",
    ]);
  });

  it("행사 확정 body는 s3Key·durationSec·recordedAt뿐 — 좌표를 싣지 않는다", async () => {
    const { buildConfirmEffects, createOrchestration, runUploadFlow } =
      await loadEffects();
    const observed = stubFetch(respondUpload);

    await runUploadFlow(
      createOrchestration(),
      buildConfirmEffects(eventConfirmInput),
    );

    const body = observed.at(-1)!.body as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      "durationSec",
      "recordedAt",
      "s3Key",
    ]);
    expect(body).toMatchObject({ s3Key: "videos/clip.mp4", durationSec: 5 });
  });
});
