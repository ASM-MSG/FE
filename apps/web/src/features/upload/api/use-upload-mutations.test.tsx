import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useProcessingStore } from "@/features/upload/model/processing-store";
import {
  getCellQueryKey,
  getOccupiedInViewportInfiniteQueryKey,
  getPlaybackQueryKey,
  getRegionVideosQueryKey,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { envelopeResponse } from "@/test/envelope-response";
import {
  useAnalyzeVideo,
  useConfirmUpload,
  useReplaceVideo,
} from "./use-upload-mutations";

/**
 * 업로드 뮤테이션 훅 (B3·B9·B13) — 선분석·확정 각각 presign → S3 PUT → 확정 순서를
 * fetch 목의 URL 순서로 검증하고, 확정 성공 시 invalidate·대기 등록 배선을 단정한다.
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
  useProcessingStore.setState({ pending: [] });
});

afterEach(() => {
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
    });
    // recordedAt = 업로드 시각 ISO (결정 B), visibility 미전송 (B9)
    expect(Number.isNaN(Date.parse(String(confirmBody.recordedAt)))).toBe(
      false,
    );
    expect(confirmBody).not.toHaveProperty("visibility");
  });

  it("확정 성공 시 점령 격자·격자 상세 쿼리가 생성 키로 invalidate되고 (B13), 처리 대기 목록에 videoId가 등록된다 (B15)", async () => {
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

    const pending = useProcessingStore.getState().pending;
    expect(pending.map((p) => p.videoId)).toEqual([42]);
  });

  it("확정 실패 시 대기 등록·invalidate가 일어나지 않는다", async () => {
    stubFetch(
      routeHappyPath({
        onFinalize: () => new Response(null, { status: 500 }),
      }),
    );
    const { wrapper } = createHarness();

    const { result } = renderHook(() => useConfirmUpload(), { wrapper });
    act(() => {
      result.current.mutate(confirmInput());
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(useProcessingStore.getState().pending).toEqual([]);
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
  });

  it("교체 성공 시 처리 대기 등록 + playback·도감 동 영상 목록·격자 쿼리가 invalidate된다 (AC 4)", async () => {
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

    // ① UPLOADED→READY 폴링은 기존 워처 재사용 — 등록만 단정
    expect(useProcessingStore.getState().pending.map((p) => p.videoId)).toEqual(
      [42],
    );
    // ② 해당 videoId playback (썸네일·상태 최신화)
    expect(queryClient.getQueryState(playbackKey)?.isInvalidated).toBe(true);
    // ③ 도감 동 영상 목록(부분 키) + 격자 영상 목록(invalidateGridQueries)
    expect(queryClient.getQueryState(regionKey)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(cellKey)?.isInvalidated).toBe(true);
  });

  it("교체 확정(PUT) 실패 시 track·무효화가 일어나지 않고, 재시도는 성공한 presign·S3 PUT을 건너뛴다 (AC 5)", async () => {
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
    expect(useProcessingStore.getState().pending).toEqual([]);
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
