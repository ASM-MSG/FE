import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { stubDexFetch } from "./dex-fetch-stub";
import { renderDexPanel, resetDexStores } from "./dex-test-harness";

/**
 * 지역별 갤러리 스모크 (MSG-327 기준 10·12·13·15·25) — 동 행 클릭으로 갤러리에 들어간 뒤의
 * 계약만 고정한다: 헤더 카운트, 격자별 그룹, 영상 카드 클릭 → 미니 패널 재생, 빈 결과.
 * 그룹 정렬·라벨 폴백의 값 판정은 gallery-groups 단위 테스트가 이미 촘촘히 덮는다.
 */

const video = (over: Partial<Record<string, unknown>> = {}) => ({
  videoId: 1,
  gridId: "39064_112221",
  thumbnailUrl: null,
  processingStatus: "READY",
  durationSec: 84,
  createdAt: "2026-08-13T09:00:00Z",
  zoneName: "서면",
  zoneCell: "A-02",
  ...over,
});

/** 동 행을 눌러 갤러리로 들어간다 — 실제 사용자 진입 경로 그대로 */
const enterGallery = async () => {
  renderDexPanel();
  fireEvent.click(
    await screen.findByRole("button", { name: /부전제1동.*영상 4개/ }),
  );
};

describe("지역별 갤러리 스모크", () => {
  beforeEach(() => {
    resetDexStores();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("동 행을 누르면 그 동의 갤러리가 열리고 헤더에 격자 수·영상 수가 표시된다 (기준 10)", async () => {
    stubDexFetch({
      videos: [video({ videoId: 1 }), video({ videoId: 2, gridId: "9_9" })],
    });
    await enterGallery();

    expect(
      await screen.findByText("부전제1동 · 격자 2개 · 영상 2개"),
    ).toBeTruthy();
  });

  it("본문이 격자별 그룹으로 나뉘고 그룹 헤더에 격자 라벨과 영상 수가 표시된다 (기준 12)", async () => {
    stubDexFetch({ videos: [video({ videoId: 1 }), video({ videoId: 2 })] });
    await enterGallery();

    expect(
      await screen.findByRole("heading", { name: "서면 A-02" }),
    ).toBeTruthy();
    expect(screen.getByText("영상 2개")).toBeTruthy();
  });

  it("영상 카드를 누르면 우측 미니 패널이 그 영상으로 열린다 (기준 25)", async () => {
    stubDexFetch({ videos: [video({ videoId: 7 })] });
    await enterGallery();

    fireEvent.click(await screen.findByRole("button", { name: /수집/ }));

    expect(useVideoMiniPanelStore.getState().selected?.video.videoId).toBe(7);
    // 도감 영상은 전부 내 영상이라 소유 메타가 "내 영상"으로 분기한다
    expect(useVideoMiniPanelStore.getState().selected?.mine).toBe(true);
  });

  it("그 동에 영상이 없으면 빈 상태 안내가 표시된다 (기준 15)", async () => {
    stubDexFetch({ videos: [] });
    await enterGallery();

    expect(
      await screen.findByText(/부전제1동에서 수집한 영상이 아직 없어요/),
    ).toBeTruthy();
  });

  it("행정동을 판정하지 못한 격자(by-grid data null)면 로딩이 아니라 안내로 끝난다 (기준 11 방어 — codex 리뷰 반영)", async () => {
    stubDexFetch({ gridStat: null });
    await enterGallery();

    expect(await screen.findByText(/행정동 정보를 찾지 못해/)).toBeTruthy();
    expect(
      screen.queryByRole("status", { name: "갤러리 불러오는 중" }),
    ).toBeNull();
  });

  it("갤러리 조회 실패 시 오류 안내와 재시도 버튼이 표시된다 (기준 15)", async () => {
    stubDexFetch({ failPath: "/api/collections/videos" });
    await enterGallery();

    expect(await screen.findByText("갤러리를 불러오지 못했어요")).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
  });

  it("'전체 보기'를 누르면 동 목록으로 복귀한다 (기준 10, 추정 7)", async () => {
    stubDexFetch({ videos: [video()] });
    await enterGallery();

    fireEvent.click(await screen.findByRole("button", { name: "전체 보기" }));

    expect(screen.getByText("최근 수집한 격자")).toBeTruthy();
    expect(useGalleryRegionStore.getState().selected).toBeNull();
  });
});
