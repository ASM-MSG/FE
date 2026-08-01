import { beforeEach, describe, expect, it } from "vitest";
import type { CellVideo } from "@/entities/cell";
import { useHomeCellDetailStore } from "./home-cell-detail-store";
import { useThemeFilterStore } from "./theme-filter-store";
import { useVideoMiniPanelStore } from "./video-mini-panel-store";

/** 최소 영상 픽스처 — 서면 목 관례 (부산 서면 MVP) */
const buildVideo = (videoId: number): CellVideo => ({
  videoId,
  title: `표본 영상 ${videoId}`,
  viewCount: 1200,
  recordedAt: "2026-07-29T12:00:00.000Z",
  durationSec: 24,
  videoSrc: "https://mdn.github.io/shared-assets/videos/flower.mp4",
});

const VIDEO_A = buildVideo(101);
const VIDEO_B = buildVideo(102);

const resetStores = () => {
  useVideoMiniPanelStore.setState(
    useVideoMiniPanelStore.getInitialState(),
    true,
  );
  useHomeCellDetailStore.setState(
    useHomeCellDetailStore.getInitialState(),
    true,
  );
  useThemeFilterStore.setState(useThemeFilterStore.getInitialState(), true);
};

describe("useVideoMiniPanelStore — 영상 미니 패널 선택 (3차 AC 1)", () => {
  beforeEach(resetStores);

  it("초기 상태는 선택 없음(미니 패널 닫힘)이다", () => {
    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
  });

  it("영상 카드 클릭 시 선택 영상(영상 데이터 + mine)이 저장된다 (AC 1)", () => {
    useVideoMiniPanelStore.getState().open(VIDEO_A, true);

    expect(useVideoMiniPanelStore.getState().selected).toEqual({
      video: VIDEO_A,
      mine: true,
    });
  });

  it("열린 상태에서 다른 영상 선택 시 선택이 교체된다 (AC 1)", () => {
    useVideoMiniPanelStore.getState().open(VIDEO_A, true);
    useVideoMiniPanelStore.getState().open(VIDEO_B, false);

    expect(useVideoMiniPanelStore.getState().selected).toEqual({
      video: VIDEO_B,
      mine: false,
    });
  });

  it("close로 닫으면 선택이 비워진다 — 닫기 버튼 배선의 대상", () => {
    useVideoMiniPanelStore.getState().open(VIDEO_A, true);
    useVideoMiniPanelStore.getState().close();

    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
  });
});

describe("useVideoMiniPanelStore — 컨텍스트 닫힘 연동 (3차 AC 2·3)", () => {
  beforeEach(resetStores);

  it("셀 상세 닫힘(close) 시 미니 패널 선택이 닫힌다 (AC 3)", () => {
    useHomeCellDetailStore.getState().select("A-14");
    useVideoMiniPanelStore.getState().open(VIDEO_A, true);

    useHomeCellDetailStore.getState().close();

    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
  });

  it("다른 셀 선택(select) 시 미니 패널 선택이 닫힌다 (AC 3)", () => {
    useHomeCellDetailStore.getState().select("A-14");
    useVideoMiniPanelStore.getState().open(VIDEO_A, true);

    useHomeCellDetailStore.getState().select("B-08");

    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
  });

  it("같은 셀 재선택(select) 시 미니 패널 선택이 유지된다 — 상세 컨텍스트 불변 (리뷰 반영)", () => {
    useHomeCellDetailStore.getState().select("A-14");
    useVideoMiniPanelStore.getState().open(VIDEO_A, true);

    useHomeCellDetailStore.getState().select("A-14");

    expect(useVideoMiniPanelStore.getState().selected).not.toBeNull();
  });

  // 아래 3케이스는 내부 배선(toggle→detail.close 체인)과 무관하게 결과 계약만 단정한다 (스펙 신규 로직 3)
  it("테마 칩 해제(toggle) 시 미니 패널 선택이 닫힌다 (AC 2)", () => {
    useThemeFilterStore.getState().toggle("hot");
    useVideoMiniPanelStore.getState().open(VIDEO_A, false);

    useThemeFilterStore.getState().toggle("hot");

    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
  });

  it("테마 칩 전환(toggle) 시 미니 패널 선택이 닫힌다 (AC 2)", () => {
    useThemeFilterStore.getState().toggle("hot");
    useVideoMiniPanelStore.getState().open(VIDEO_A, false);

    useThemeFilterStore.getState().toggle("festival");

    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
  });

  it("홈 이탈(reset) 시 미니 패널 선택이 닫힌다 (AC 2)", () => {
    useThemeFilterStore.getState().toggle("hot");
    useVideoMiniPanelStore.getState().open(VIDEO_A, false);

    useThemeFilterStore.getState().reset();

    expect(useVideoMiniPanelStore.getState().selected).toBeNull();
  });
});
