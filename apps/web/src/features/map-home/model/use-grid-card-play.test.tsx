import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { envelopeResponse } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useGridCardPlay } from "./use-grid-card-play";

// 실패 경로 단정이 있어 retry:false 클라이언트를 로컬 정의한다 (queryWrapper 주석 관례)
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

/**
 * 격자 카드 재생 훅 (사용자 피드백 — 상세 미오픈 재생) — 카드 클릭이 격자 상세를 열지
 * 않고 영상 목록만 조회해 첫 영상을 오른쪽 미니 패널로 여는 계약.
 */
const SEOMYEON = "39064_112221";

const GLOBAL_VIDEO = {
  videoId: 501,
  thumbnailUrl: "data:,thumb",
  durationSec: 24,
  viewCount: 10,
  recordedAt: "2026-08-01T00:00:00Z",
  nickname: "필맵퍼",
};

/** 격자 영상 목록 2종(전역·내 영상) 스텁 — mode로 성공·빈 목록·실패를 갈아끼운다 */
const stubGridVideos = (mode: "ready" | "empty" | "error") => {
  stubFetch(async (request) => {
    if (mode === "error") return new Response(null, { status: 500 });
    const { pathname } = new URL(request.url);
    if (pathname.endsWith("/my-videos")) return envelopeResponse([]);
    return envelopeResponse({
      videos: mode === "ready" ? [GLOBAL_VIDEO] : [],
      hasNext: false,
      nextCursor: null,
    });
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  useVideoMiniPanelStore.setState({ selected: null });
});

/** 훅을 마운트하고 서면 격자 재생을 시작한다 — 케이스 공용 셋업 */
const playSeomyeon = () => {
  const { result } = renderHook(() => useGridCardPlay(), { wrapper });
  act(() => result.current.play(SEOMYEON));
  return result;
};

describe("useGridCardPlay — 격자 카드 클릭 재생 (사용자 피드백)", () => {
  it("play(gridId)하면 목록 도착 시 첫 영상이 미니 패널로 열린다 — 격자 상세는 경유하지 않는다", async () => {
    stubGridVideos("ready");

    playSeomyeon();

    await waitFor(() =>
      expect(useVideoMiniPanelStore.getState().selected?.video.videoId).toBe(
        501,
      ),
    );
    expect(useVideoMiniPanelStore.getState().selected?.mine).toBe(false);
  });

  it("재생할 영상이 없으면 미니 패널 대신 빈 목록 안내 상태가 된다 (조용한 무시 금지)", async () => {
    stubGridVideos("empty");

    const result = playSeomyeon();

    await waitFor(() => expect(result.current.notice).toBe("empty"));
    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
  });

  it("목록 조회가 실패하면 실패 안내 상태가 된다 (조용한 무시 금지)", async () => {
    stubGridVideos("error");

    const result = playSeomyeon();

    await waitFor(() => expect(result.current.notice).toBe("error"), {
      timeout: 3000,
    });
    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
  });
});

describe("useGridCardPlay — 재생 중 격자 강조 수명 (사용자 피드백)", () => {
  it("재생이 열리면 그 격자가 강조 대상(playingGridId)이 된다", async () => {
    stubGridVideos("ready");

    const result = playSeomyeon();

    await waitFor(() => expect(result.current.playingGridId).toBe(SEOMYEON));
  });

  it("미니 패널을 닫으면 강조가 해제된다", async () => {
    stubGridVideos("ready");
    const result = playSeomyeon();
    await waitFor(() => expect(result.current.playingGridId).toBe(SEOMYEON));

    act(() => useVideoMiniPanelStore.getState().close());

    await waitFor(() => expect(result.current.playingGridId).toBeNull());
  });

  it("상세 흐름 등에서 다른 영상으로 교체되면 강조가 해제된다 — 기존 시각 상태와 충돌 없음", async () => {
    stubGridVideos("ready");
    const result = playSeomyeon();
    await waitFor(() => expect(result.current.playingGridId).toBe(SEOMYEON));

    act(() =>
      useVideoMiniPanelStore.getState().open(
        {
          videoId: 999,
          thumbnailUrl: null,
          durationSec: 10,
          viewCount: null,
          recordedAt: "2026-08-02T00:00:00Z",
        },
        true,
      ),
    );

    await waitFor(() => expect(result.current.playingGridId).toBeNull());
  });

  it("다른 카드를 재생하면 이전 강조를 해제하고 새 격자로 이동한다", async () => {
    stubGridVideos("ready");
    const result = playSeomyeon();
    await waitFor(() => expect(result.current.playingGridId).toBe(SEOMYEON));

    act(() => result.current.play("39070_112230"));

    expect(result.current.playingGridId).toBeNull();
    await waitFor(() =>
      expect(result.current.playingGridId).toBe("39070_112230"),
    );
  });
});
