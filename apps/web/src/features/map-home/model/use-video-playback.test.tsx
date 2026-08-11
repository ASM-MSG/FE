import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { READY_PLAYBACK } from "@/test/playback-fixture";
import { stubFetch } from "@/test/stub-fetch";
import {
  playbackUnavailableMessage,
  useVideoPlayback,
} from "./use-video-playback";

/**
 * 대표 영상 재생 조회 (격자 상세 재생 배선) — GET /api/videos/{videoId}의
 * playbackUrl(READY면 블러본 presigned GET)을 가져온다. READY 전이면 null이다.
 */

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useVideoPlayback — 격자 상세 재생 조회", () => {
  it("videoId로 재생 조회를 호출하고 언랩된 playbackUrl을 돌려준다", async () => {
    const received = stubFetch(() => envelopeResponse(READY_PLAYBACK));

    const { result } = renderHook(() => useVideoPlayback(42), {
      wrapper: createWrapper(),
    });
    await waitFor(() =>
      expect(result.current.data?.playbackUrl).toBe(
        "https://cdn.example.com/blurred.mp4",
      ),
    );

    expect(new URL(received[0].request.url).pathname).toBe("/api/videos/42");
  });

  it("videoId가 null이면 조회하지 않는다 (모달 닫힘 상태)", () => {
    const received = stubFetch(() => envelopeResponse(READY_PLAYBACK));

    renderHook(() => useVideoPlayback(null), { wrapper: createWrapper() });

    expect(received).toHaveLength(0);
  });
});

describe("playbackUnavailableMessage — 재생 불가 사유 문구", () => {
  it("FAILED는 '처리 중'이 아니라 실패 안내를 돌려준다", () => {
    expect(
      playbackUnavailableMessage({
        processingStatus: "FAILED",
        status: "ACTIVE",
      }),
    ).toBe("영상 처리에 실패했어요. 다시 업로드가 필요해요");
  });

  it("소유자 블라인드는 블라인드 안내를 돌려준다", () => {
    expect(
      playbackUnavailableMessage({
        processingStatus: "READY",
        status: "BLINDED",
      }),
    ).toBe("블라인드 처리된 영상이라 재생할 수 없어요");
  });

  it("처리 중(UPLOADED·ENCODING·BLURRING)은 처리 중 안내를 돌려준다", () => {
    for (const processingStatus of ["UPLOADED", "ENCODING", "BLURRING"]) {
      expect(
        playbackUnavailableMessage({ processingStatus, status: "ACTIVE" }),
      ).toBe("AI가 아직 처리 중인 영상이에요. 처리가 끝나면 재생할 수 있어요");
    }
  });
});
