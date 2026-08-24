import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper as wrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useMissionVideosQuery } from "./use-mission-videos-query";

const video = (videoId: number, recordedAt: string) => ({
  videoId,
  gridId: "16858_11420",
  thumbnailUrl: null,
  durationSec: 12,
  viewCount: 30,
  recordedAt,
  nickname: "규호",
});

beforeEach(() => {
  signInForTest();
});

afterEach(() => {
  signOutForTest();
  vi.unstubAllGlobals();
});

describe("useMissionVideosQuery — 미션 영상 피드 (AC 22)", () => {
  it("미션 영상 목록을 피드 항목으로 준다 (AC 22)", async () => {
    stubFetch(async () =>
      envelopeResponse({
        videos: [
          video(2, "2026-08-14T10:00:00Z"),
          video(1, "2026-08-13T10:00:00Z"),
        ],
        hasNext: false,
        nextCursor: null,
      }),
    );

    const { result } = renderHook(() => useMissionVideosQuery(12), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map((v) => v.videoId)).toEqual([2, 1]);
    expect(result.current.items[0].uploaderHandle).toBe("@규호");
  });

  it("비로그인에서도 조회해 영상 피드를 준다 — MSG-454로 익명 조회 허용 (AC 8·9)", async () => {
    signOutForTest();
    stubFetch(async () =>
      envelopeResponse({
        videos: [video(7, "2026-08-14T10:00:00Z")],
        hasNext: false,
        nextCursor: null,
      }),
    );

    const { result } = renderHook(() => useMissionVideosQuery(12), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map((v) => v.videoId)).toEqual([7]);
  });

  it("선택된 미션이 없으면 조회하지 않는다 (AC 22)", async () => {
    const fetchSpy = vi.fn(async () =>
      envelopeResponse({ videos: [], hasNext: false, nextCursor: null }),
    );
    stubFetch(fetchSpy);

    const { result } = renderHook(() => useMissionVideosQuery(null), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.items).toEqual([]);
  });

  it("영상이 없으면 빈 피드다 — 실패가 아니다 (AC 22)", async () => {
    stubFetch(async () =>
      envelopeResponse({ videos: [], hasNext: false, nextCursor: null }),
    );

    const { result } = renderHook(() => useMissionVideosQuery(12), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(result.current.isError).toBe(false);
  });
});

describe("useMissionVideosQuery — 익명 게이트 해제 (MSG-462 AC 13)", () => {
  it("비로그인 상태에서도 조회한다 — 서버 MSG-454 익명 허용 (AC 13)", async () => {
    signOutForTest();
    stubFetch(async () =>
      envelopeResponse({
        videos: [video(1, "2026-08-13T10:00:00Z")],
        hasNext: false,
        nextCursor: null,
      }),
    );

    const { result } = renderHook(() => useMissionVideosQuery(12), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map((v) => v.videoId)).toEqual([1]);
  });
});
