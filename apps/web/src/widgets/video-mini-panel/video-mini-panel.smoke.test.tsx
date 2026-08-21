import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { VideoMiniSelection } from "@/features/map-home/model/video-mini-panel-store";
import { envelopeResponse } from "@/test/envelope-response";
import { READY_PLAYBACK } from "@/test/playback-fixture";
import { stubFetch } from "@/test/stub-fetch";
import { VideoMiniPanel } from "./VideoMiniPanel";

/**
 * 영상 미니 디테일 패널 스모크 (MSG-277 3차 AC 5·6 → MSG-326 실 재생 배선).
 * video 요소(선택 영상 videoSrc)·메타(제목·소유 문구·시간·조회수)·닫기 버튼 렌더와
 * 열림 시 닫기 버튼 포커스(교체 시 이동 없음)를 고정한다.
 * 열림/교체 전환 자체는 스토어 테스트(video-mini-panel-store)가 커버 — 여기서는 렌더 계약만.
 * MSG-326: 패널이 재생 조회 훅(use-video-playback-query)을 쓴다 — 목 픽스처는 전부
 * videoSrc 보유(쿼리 비활성)라 기존 단정 불변이고, 서버 영상(videoSrc 없음)은
 * video.videoId로 playbackUrl을 지연 조회한다 (MSG-329 serverVideoId 병합 정리).
 */

// 패널이 재생 조회 훅(useQuery)을 품어 QueryClient 전제가 생겼다 —
// 목 경로(videoSrc 보유)는 조회하지 않는다
const withQueryClient = (ui: React.ReactNode) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {ui}
  </QueryClientProvider>
);

// jsdom은 HTMLMediaElement.play를 구현하지 않아 autoplay 시도(추정 4)가 콘솔 노이즈를 남긴다 —
// 계약 대상이 아니므로 무해한 스텁으로 대체한다
beforeAll(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});

/** 고정 픽스처 — 서면 목 관례 (부산 서면 MVP). 내 영상: M월 D일 분기 검증용 과거 고정 시각 */
const MINE_SELECTION: VideoMiniSelection = {
  video: {
    videoId: 101,
    title: "거리 야경 감성 스팟",
    viewCount: 12000,
    recordedAt: "2026-07-15T12:00:00.000Z",
    durationSec: 30,
    thumbnailUrl: "data:,thumb",
    videoSrc: "https://mdn.github.io/shared-assets/videos/flower.mp4",
  },
  mine: true,
};

/** 타인 영상 — @핸들 분기 + 다른 videoSrc(교체 검증용) */
const OTHER_SELECTION: VideoMiniSelection = {
  video: {
    videoId: 201,
    title: "숨은 골목 카페 투어",
    viewCount: 8410,
    recordedAt: "2026-07-29T12:00:00.000Z",
    durationSec: 26,
    thumbnailUrl: "data:,thumb",
    uploaderHandle: "@jeonpo_alley",
    videoSrc: "https://mdn.github.io/shared-assets/videos/friday.mp4",
  },
  mine: false,
};

describe("영상 미니 디테일 패널 스모크 (3차 AC 5·6)", () => {
  afterEach(() => {
    cleanup();
  });

  it("선택 영상 videoSrc의 video 요소와 제목·조회수 메타가 렌더된다 (AC 5)", () => {
    const { container } = render(
      withQueryClient(
        <VideoMiniPanel selected={MINE_SELECTION} onClose={() => {}} />,
      ),
    );

    const video = container.querySelector("video");
    expect(video?.getAttribute("src")).toBe(
      "https://mdn.github.io/shared-assets/videos/flower.mp4",
    );
    // 재생 제어는 브라우저 네이티브 controls에 위임 (스펙 뷰 5)
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(screen.getByText("거리 야경 감성 스팟")).toBeTruthy();
    expect(screen.getByText(/조회 1\.2만/)).toBeTruthy();
  });

  it("내 영상이면 '내 영상 · M월 D일', 타인이면 @핸들 소유 문구가 보인다 — 카드와 동일 분기 (AC 5, 추정 5)", () => {
    const { rerender } = render(
      withQueryClient(
        <VideoMiniPanel selected={MINE_SELECTION} onClose={() => {}} />,
      ),
    );
    expect(screen.getByText(/내 영상/)).toBeTruthy();
    expect(screen.getByText(/7월 15일/)).toBeTruthy();

    rerender(
      withQueryClient(
        <VideoMiniPanel selected={OTHER_SELECTION} onClose={() => {}} />,
      ),
    );
    expect(screen.getByText(/@jeonpo_alley/)).toBeTruthy();
  });

  it("닫기 버튼 클릭 시 onClose가 호출된다 (AC 5)", () => {
    const onClose = vi.fn();
    render(
      withQueryClient(
        <VideoMiniPanel selected={MINE_SELECTION} onClose={onClose} />,
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "미니 패널 닫기" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("열릴 때 포커스가 닫기 버튼으로 이동하고, 교체 시에는 이동하지 않는다 (AC 6)", () => {
    const { rerender } = render(
      withQueryClient(
        <VideoMiniPanel selected={MINE_SELECTION} onClose={() => {}} />,
      ),
    );

    const closeButton = screen.getByRole("button", { name: "미니 패널 닫기" });
    expect(document.activeElement).toBe(closeButton);

    // 사용자가 포커스를 옮긴 뒤 다른 카드로 교체 — 포커스를 다시 빼앗지 않는다
    closeButton.blur();
    rerender(
      withQueryClient(
        <VideoMiniPanel selected={OTHER_SELECTION} onClose={() => {}} />,
      ),
    );

    expect(document.activeElement).not.toBe(closeButton);
  });
});

/** 서버 영상 선택 (격자 상세 피드) — videoSrc 없이 video.videoId로 playbackUrl 지연 조회 */
const SERVER_SELECTION: VideoMiniSelection = {
  video: {
    videoId: 42,
    title: "서면 F-8 대표 영상",
    viewCount: 19,
    recordedAt: "2026-08-02T05:00:00.000Z",
    durationSec: 5,
    thumbnailUrl: "data:,thumb",
  },
  mine: false,
};

const renderServer = (body: Record<string, unknown>) => {
  stubFetch(() => envelopeResponse(body));
  return render(
    withQueryClient(
      <VideoMiniPanel selected={SERVER_SELECTION} onClose={() => {}} />,
    ),
  );
};

describe("서버 영상 미니 패널 — playbackUrl 지연 조회 (MSG-326 기준 9·12)", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("READY면 playbackUrl로 video 요소가 렌더된다", async () => {
    const { container } = renderServer(READY_PLAYBACK);

    await waitFor(() =>
      expect(container.querySelector("video")?.getAttribute("src")).toBe(
        "https://cdn.example.com/blurred.mp4",
      ),
    );
  });

  it("READY 전(playbackUrl null)이면 처리 중 안내가 뜬다", async () => {
    renderServer({
      ...READY_PLAYBACK,
      playbackUrl: null,
      processingStatus: "BLURRING",
    });

    expect(
      await screen.findByText(
        "AI가 아직 처리 중인 영상이에요. 처리가 끝나면 재생할 수 있어요",
      ),
    ).toBeTruthy();
  });
});
