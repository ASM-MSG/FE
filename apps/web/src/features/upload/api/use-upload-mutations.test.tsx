import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCellQueryKey,
  getOccupiedInViewportInfiniteQueryKey,
  getPlaybackQueryKey,
  getRegionVideosQueryKey,
  getUploadHistoryQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { envelopeResponse } from "@/test/envelope-response";
import {
  READY_POLL_FIRST_DELAY_MS,
  READY_POLL_INTERVAL_MS,
} from "../model/ready-poll";
import { __resetReadyRefreshForTest } from "./start-ready-refresh";
import {
  useAnalyzeVideo,
  useConfirmUpload,
  useReplaceVideo,
} from "./use-upload-mutations";

/**
 * 업로드 뮤테이션 훅 (B3·B9·B13) — 선분석·확정 각각 presign → S3 PUT → 확정 순서를
 * fetch 목의 URL 순서로 검증하고, 확정 성공 시 invalidate 배선을 단정한다.
 * 블러 처리 대기 등록은 MSG-476에서 파이프라인째 삭제 — 미등록을 단정한다.
 */

const createHarness = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

interface ReceivedCall {
  url: URL;
  method: string;
  body: unknown;
  headers: Headers;
}

/** fetch 목 — hey-api(ky 경유 Request)와 S3 PUT(url+init) 두 호출 형태를 모두 기록한다 */
const stubFetch = (
  route: (call: ReceivedCall) => Response | Promise<Response>,
) => {
  const received: ReceivedCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : null;
      const url = new URL(request ? request.url : String(input));
      const method = request?.method ?? init?.method ?? "GET";
      const headers = new Headers(request ? request.headers : init?.headers);
      let body: unknown;
      if (request && request.body !== null) {
        body = await request
          .clone()
          .json()
          .catch(() => undefined);
      }
      const call: ReceivedCall = { url, method, body, headers };
      received.push(call);
      return route(call);
    }),
  );
  return received;
};

const PRESIGN_DATA = {
  uploadUrl: "https://bucket.s3.example.com/put?sig=abc",
  s3Key: "videos/pending/1/key.mp4",
  expiresInSec: 600,
};

/** 기본 라우팅 — presign·S3 PUT·선분석·확정 전부 성공 */
const routeHappyPath =
  (overrides?: {
    highlights?: number[][] | null;
    onFinalize?: () => Response | null;
  }) =>
  (call: ReceivedCall): Response => {
    if (call.url.pathname === "/api/videos/presigned-url") {
      return envelopeResponse(PRESIGN_DATA);
    }
    if (call.url.hostname === "bucket.s3.example.com") {
      return new Response(null, { status: 200 });
    }
    if (call.url.pathname === "/api/videos/highlight-preview") {
      return envelopeResponse({
        highlights: overrides?.highlights ?? [[0, 5]],
      });
    }
    // 교체 확정 — PUT /api/videos/{videoId} (MSG-415 AC 3)
    if (call.url.pathname === "/api/videos/42" && call.method === "PUT") {
      const override = overrides?.onFinalize?.();
      if (override) return override;
      return envelopeResponse({ videoId: 42, processingStatus: "UPLOADED" });
    }
    if (call.url.pathname === "/api/videos") {
      const override = overrides?.onFinalize?.();
      if (override) return override;
      return envelopeResponse({
        videoId: 42,
        gridId: "grid-77",
        processingStatus: "UPLOADED",
        occupied: true,
        newBadges: [],
        completedMissions: [],
        zoneName: "서면",
        zoneCell: "A-14",
        regionName: "부산 부산진구 부전동",
      });
    }
    throw new Error(`예상 밖 요청: ${call.url.href}`);
  };

beforeEach(() => {
  localStorage.clear();
  // 모듈 수준 폴링 등록은 테스트 간 누수 대상이다 (영상당 1개 제한 때문에 두 번째
  // 케이스가 조용히 폴링 없이 지나갈 수 있다)
  __resetReadyRefreshForTest();
  // READY 폴링은 세션이 있어야 시작한다 (codex 2차 리뷰 — 로그아웃 후 시작 금지)
  useAuthStore.setState({ accessToken: "token-test", isAuthenticated: true });
});

afterEach(() => {
  __resetReadyRefreshForTest();
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  vi.unstubAllGlobals();
});

const videoFile = () => new File(["v"], "clip.mp4", { type: "video/mp4" });

describe("useAnalyzeVideo — 선분석 흐름 (B3)", () => {
  it("presign(purpose=HIGHLIGHT_PREVIEW) → S3 PUT → highlight-preview 순서로 호출하고 highlights를 반환한다", async () => {
    const received = stubFetch(routeHappyPath({ highlights: [[3, 8]] }));
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });
    act(() => {
      result.current.mutate(videoFile());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(received.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
      "POST /api/videos/presigned-url",
      "PUT /put",
      "POST /api/videos/highlight-preview",
    ]);
    expect(received[0].body).toMatchObject({
      purpose: "HIGHLIGHT_PREVIEW",
      extension: "mp4",
      contentType: "video/mp4",
      contentLength: 1,
    });
    expect(received[2].body).toEqual({ s3Key: PRESIGN_DATA.s3Key });
    expect(result.current.data).toEqual([[3, 8]]);
  });

  it("S3 PUT 요청에는 Authorization·X-Device-Id가 없다 (B10)", async () => {
    const received = stubFetch(routeHappyPath());
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });
    act(() => {
      result.current.mutate(videoFile());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const s3Call = received.find(
      (c) => c.url.hostname === "bucket.s3.example.com",
    );
    expect(s3Call?.headers.get("Authorization")).toBeNull();
    expect(s3Call?.headers.get("X-Device-Id")).toBeNull();
  });

  it("선분석 실패 후 재시도하면 성공한 presign·S3 PUT은 건너뛰고 선분석만 다시 호출한다 (B11)", async () => {
    let failNext = true;
    const received = stubFetch((call) => {
      if (call.url.pathname === "/api/videos/highlight-preview" && failNext) {
        failNext = false;
        return new Response(
          JSON.stringify({ developCode: 3502, message: "분석 서버 오류" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      return routeHappyPath()(call);
    });
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useAnalyzeVideo(), { wrapper });
    act(() => {
      result.current.mutate(videoFile());
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    act(() => {
      result.current.mutate(videoFile());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const paths = received.map((c) => c.url.pathname);
    expect(paths.filter((p) => p === "/api/videos/presigned-url")).toHaveLength(
      1,
    );
    expect(paths.filter((p) => p === "/put")).toHaveLength(1);
    expect(
      paths.filter((p) => p === "/api/videos/highlight-preview"),
    ).toHaveLength(2);
  });
});

describe("useConfirmUpload — 확정 흐름 (B9·B13)", () => {
  const confirmInput = () => ({
    blob: new Blob(["trimmed"], { type: "video/mp4" }),
    lat: 35.1579,
    lng: 129.0594,
    durationSec: 8,
    visibility: "PUBLIC" as const,
  });

  it("presign(purpose 미전송=UPLOAD) → 잘린 영상 S3 PUT → POST /api/videos 순서로 호출한다 (B9)", async () => {
    const received = stubFetch(routeHappyPath());
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useConfirmUpload(), { wrapper });
    act(() => {
      result.current.mutate(confirmInput());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(received.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
      "POST /api/videos/presigned-url",
      "PUT /put",
      "POST /api/videos",
    ]);
    // purpose 미전송 = UPLOAD (B9)
    expect(received[0].body).not.toHaveProperty("purpose");

    const confirmBody = received[2].body as Record<string, unknown>;
    expect(confirmBody).toMatchObject({
      s3Key: PRESIGN_DATA.s3Key,
      lat: 35.1579,
      lng: 129.0594,
      durationSec: 8,
      // 선택 UI 도입으로 PUBLIC도 명시 전송 (MSG-476 AC 2, 추정 2)
      visibility: "PUBLIC",
    });
    // recordedAt = 업로드 시각 ISO (결정 B)
    expect(Number.isNaN(Date.parse(String(confirmBody.recordedAt)))).toBe(
      false,
    );
  });

  it("'나만 보기' 선택값이 확정 body에 visibility PRIVATE로 그대로 실린다 (MSG-476 AC 2)", async () => {
    const received = stubFetch(routeHappyPath());
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useConfirmUpload(), { wrapper });
    act(() => {
      result.current.mutate({ ...confirmInput(), visibility: "PRIVATE" });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const confirmBody = received[2].body as Record<string, unknown>;
    expect(confirmBody.visibility).toBe("PRIVATE");
  });

  it("확정 성공 시 점령 격자·격자 상세 쿼리가 생성 키로 invalidate되고 (B13), 블러 처리 대기 등록은 일어나지 않는다 (MSG-476 AC 7)", async () => {
    stubFetch(routeHappyPath());
    const { queryClient, wrapper } = createHarness();
    const viewport = { swLat: 35, swLng: 129, neLat: 35.2, neLng: 129.2 };
    const occupiedKey = getOccupiedInViewportInfiniteQueryKey({
      query: viewport,
    });
    const cellKey = getCellQueryKey({ path: { gridId: "grid-77" } });
    queryClient.setQueryData(occupiedKey, { pages: [], pageParams: [] });
    queryClient.setQueryData(cellKey, { cached: true });

    const { result } = renderHook(() => useConfirmUpload(), { wrapper });
    act(() => {
      result.current.mutate(confirmInput());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(occupiedKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(true);

    // 블러 파이프라인 삭제 (MSG-476 AC 7) — localStorage 대기 목록에 아무것도 안 남는다
    expect(localStorage.getItem("fillmap.upload.pending:v1")).toBeNull();
  });

  it("확정 성공 시 READY 폴링이 시작돼, READY 전이에서 격자 쿼리를 한 번 더 무효화한다 (MSG-476 재작업 2회차)", async () => {
    vi.useFakeTimers();
    try {
      let processingStatus = "ENCODING";
      stubFetch((call) => {
        // 재생 조회는 GET /api/videos/{videoId} (확정 POST와 경로가 겹쳐 method로 가른다)
        if (call.url.pathname === "/api/videos/42" && call.method === "GET") {
          return envelopeResponse({
            videoId: 42,
            gridId: "grid-77",
            playbackUrl: null,
            processingStatus,
            expiresInSec: 600,
          });
        }
        return routeHappyPath()(call);
      });
      const { queryClient, wrapper } = createHarness();
      const cellKey = getCellQueryKey({ path: { gridId: "grid-77" } });
      // 도감 갤러리(getRegionVideos)는 격자 쿼리 집합 밖이다 — READY 무효화가 여기까지
      // 닿지 않으면 도감 화면은 새로고침 전까지 "처리 중"에 머문다 (QA 실측)
      const regionKey = getRegionVideosQueryKey({
        query: { regionCode: "2635010500" },
      });

      const { result } = renderHook(() => useConfirmUpload(), { wrapper });
      await act(async () => {
        result.current.mutate(confirmInput());
        await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
      });

      // 확정 시점 무효화분을 걷어내고, READY 전이가 만드는 두 번째 무효화만 본다
      queryClient.setQueryData(cellKey, { cached: true });
      queryClient.setQueryData(regionKey, { cached: true });
      expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(false);
      expect(queryClient.getQueryState(regionKey)?.isInvalidated).toBe(false);

      // 아직 non-READY — 폴링이 돌아도 무효화하지 않는다
      await act(async () => {
        await vi.advanceTimersByTimeAsync(READY_POLL_FIRST_DELAY_MS);
      });
      expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(false);

      // 서버가 READY로 전이하면 다음 조회에서 무효화된다
      processingStatus = "READY";
      await act(async () => {
        await vi.advanceTimersByTimeAsync(READY_POLL_INTERVAL_MS);
      });
      expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(regionKey)?.isInvalidated).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("확정 성공 시 업로드 잔디(upload-history) 쿼리가 무효화된다 (MSG-414 AC 11)", async () => {
    stubFetch(routeHappyPath());
    const { queryClient, wrapper } = createHarness();
    const historyKey = getUploadHistoryQueryKey();
    queryClient.setQueryData(historyKey, { cached: true });

    const { result } = renderHook(() => useConfirmUpload(), { wrapper });
    act(() => {
      result.current.mutate(confirmInput());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(historyKey)?.isInvalidated).toBe(true);
  });

  it("확정 실패 시 invalidate·후속 처리가 일어나지 않는다", async () => {
    stubFetch(
      routeHappyPath({
        onFinalize: () => new Response(null, { status: 500 }),
      }),
    );
    const { queryClient, wrapper } = createHarness();
    const historyKey = getUploadHistoryQueryKey();
    queryClient.setQueryData(historyKey, { cached: true });

    const { result } = renderHook(() => useConfirmUpload(), { wrapper });
    act(() => {
      result.current.mutate(confirmInput());
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryState(historyKey)?.isInvalidated).toBe(false);
  });
});

describe("useReplaceVideo — 교체 확정 흐름 (MSG-415 AC 3·4·5)", () => {
  const replaceInput = () => ({
    blob: new Blob(["trimmed"], { type: "video/mp4" }),
    durationSec: 8,
    videoId: 42,
    gridId: "grid-77",
  });

  it("presign(purpose 미전송) → S3 PUT → PUT /api/videos/{videoId} 순서로 호출하고 body는 s3Key·durationSec·recordedAt만이다 — lat·lng 미전송 (AC 3)", async () => {
    const received = stubFetch(routeHappyPath());
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useReplaceVideo(), { wrapper });
    act(() => {
      result.current.mutate(replaceInput());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(received.map((c) => `${c.method} ${c.url.pathname}`)).toEqual([
      "POST /api/videos/presigned-url",
      "PUT /put",
      "PUT /api/videos/42",
    ]);
    // purpose 미전송 = UPLOAD — 확정 업로드와 같은 presign (AC 3)
    expect(received[0].body).not.toHaveProperty("purpose");

    const replaceBody = received[2].body as Record<string, unknown>;
    expect(replaceBody).toMatchObject({
      s3Key: PRESIGN_DATA.s3Key,
      durationSec: 8,
    });
    expect(Number.isNaN(Date.parse(String(replaceBody.recordedAt)))).toBe(
      false,
    );
    // 좌표 생략 = 격자 유지 (추정 1) — 좌표를 보내면 GRID_MISMATCH 거부 위험
    expect(replaceBody).not.toHaveProperty("lat");
    expect(replaceBody).not.toHaveProperty("lng");
    // 교체 DTO에는 visibility 필드가 없다 — 미전송 (MSG-476 AC 11)
    expect(replaceBody).not.toHaveProperty("visibility");
  });

  it("교체 성공 시 playback·도감 동 영상 목록·격자 쿼리가 invalidate되고, 블러 처리 대기 등록은 없다 (AC 4, MSG-476 AC 7)", async () => {
    stubFetch(routeHappyPath());
    const { queryClient, wrapper } = createHarness();
    const playbackKey = getPlaybackQueryKey({ path: { videoId: 42 } });
    const regionKey = getRegionVideosQueryKey({
      query: { regionCode: "2644056000" },
    });
    const cellKey = getCellQueryKey({ path: { gridId: "grid-77" } });
    queryClient.setQueryData(playbackKey, { cached: true });
    queryClient.setQueryData(regionKey, { cached: true });
    queryClient.setQueryData(cellKey, { cached: true });

    const { result } = renderHook(() => useReplaceVideo(), { wrapper });
    act(() => {
      result.current.mutate(replaceInput());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // ① 블러 파이프라인 삭제 (MSG-476 AC 7) — 대기 등록 없음
    expect(localStorage.getItem("fillmap.upload.pending:v1")).toBeNull();
    // ② 해당 videoId playback (썸네일·상태 최신화)
    expect(queryClient.getQueryState(playbackKey)?.isInvalidated).toBe(true);
    // ③ 도감 동 영상 목록(부분 키) + 격자 영상 목록(invalidateGridQueries)
    expect(queryClient.getQueryState(regionKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(true);
  });

  it("교체 성공 시 업로드 잔디(upload-history) 쿼리가 무효화된다 (MSG-414 AC 11)", async () => {
    stubFetch(routeHappyPath());
    const { queryClient, wrapper } = createHarness();
    const historyKey = getUploadHistoryQueryKey();
    queryClient.setQueryData(historyKey, { cached: true });

    const { result } = renderHook(() => useReplaceVideo(), { wrapper });
    act(() => {
      result.current.mutate(replaceInput());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(historyKey)?.isInvalidated).toBe(true);
  });

  it("교체 확정(PUT) 실패 시 무효화가 일어나지 않고, 재시도는 성공한 presign·S3 PUT을 건너뛴다 (AC 5)", async () => {
    let failNext = true;
    const received = stubFetch((call) => {
      if (
        call.url.pathname === "/api/videos/42" &&
        call.method === "PUT" &&
        failNext
      ) {
        failNext = false;
        return new Response(
          JSON.stringify({ developCode: 500, message: "실패" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
      return routeHappyPath()(call);
    });
    const { queryClient, wrapper } = createHarness();
    const playbackKey = getPlaybackQueryKey({ path: { videoId: 42 } });
    queryClient.setQueryData(playbackKey, { cached: true });

    const { result } = renderHook(() => useReplaceVideo(), { wrapper });
    act(() => {
      result.current.mutate(replaceInput());
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    // 실패 시 후속 없음 (AC 5)
    expect(queryClient.getQueryState(playbackKey)?.isInvalidated).toBe(false);

    act(() => {
      result.current.mutate(replaceInput());
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // 성공 단계 스킵 (UploadFlowError 상태 보존 재사용)
    const paths = received.map((c) => c.url.pathname);
    expect(paths.filter((p) => p === "/api/videos/presigned-url")).toHaveLength(
      1,
    );
    expect(paths.filter((p) => p === "/put")).toHaveLength(1);
    expect(paths.filter((p) => p === "/api/videos/42")).toHaveLength(2);
  });
});
