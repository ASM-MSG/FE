import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useMultiGridVideosQuery } from "./use-multi-grid-videos-query";

const video = (videoId: number, recordedAt: string) => ({
  videoId,
  thumbnailUrl: `https://cdn.test/${videoId}.jpg`,
  durationSec: 20,
  viewCount: 100,
  recordedAt,
  nickname: "busan.vlog",
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMultiGridVideosQuery — 여러 격자의 영상을 하나의 피드로 합친다 (AC 9·17)", () => {
  it("격자 경계를 넘어 최신순으로 정렬한다 (AC 9)", async () => {
    stubFetch(async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname.includes("g1"))
        return envelopeResponse({
          videos: [video(1, "2026-08-01T10:00:00Z")],
          hasNext: false,
        });
      return envelopeResponse({
        videos: [video(2, "2026-08-10T10:00:00Z")],
        hasNext: false,
      });
    });

    const { result } = renderHook(() => useMultiGridVideosQuery(["g1", "g2"]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((v) => v.videoId)).toEqual([2, 1]);
  });

  it("같은 영상이 여러 격자에 걸쳐 와도 한 번만 담는다 (경계)", async () => {
    stubFetch(async () =>
      envelopeResponse({
        videos: [video(7, "2026-08-10T10:00:00Z")],
        hasNext: false,
      }),
    );

    const { result } = renderHook(() => useMultiGridVideosQuery(["g1", "g2"]), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map((v) => v.videoId)).toEqual([7]);
  });

  it("격자 목록이 비면 조회하지 않는다 (경계)", async () => {
    const received = stubFetch(async () =>
      envelopeResponse({
        videos: [video(1, "2026-08-01T10:00:00Z")],
        hasNext: false,
      }),
    );

    const { result } = renderHook(() => useMultiGridVideosQuery([]), {
      wrapper,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(received).toHaveLength(0);
    expect(result.current.items).toEqual([]);
    expect(result.current.isPending).toBe(false);
  });
});
