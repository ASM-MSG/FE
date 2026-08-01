import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CellVideo } from "@/entities/cell";
import { FeedVideoCard } from "./FeedVideoCard";

/**
 * 피드 영상 카드 스모크 (MSG-277 3차 AC 4) — 카드 button화 계약.
 * 1·2차의 "카드 클릭 no-op(div)"을 대체 — 접근성 이름에 영상 제목이 포함된 button으로
 * 렌더되고, 클릭 시 onSelect가 호출되는 것을 고정한다. 메타 문구 분기는 기존
 * 패널 렌더가 커버하므로 여기서는 버튼 계약만 단정한다.
 */

/** 고정 픽스처 — 서면 목 관례 (부산 서면 MVP) */
const VIDEO: CellVideo = {
  videoId: 101,
  title: "거리 야경 감성 스팟",
  viewCount: 12000,
  recordedAt: "2026-07-29T12:00:00.000Z",
  durationSec: 30,
  uploaderHandle: "@busan.vlog",
  videoSrc: "https://mdn.github.io/shared-assets/videos/flower.mp4",
};

describe("피드 영상 카드 button화 (3차 AC 4)", () => {
  afterEach(() => {
    cleanup();
  });

  it("접근성 이름에 영상 제목이 포함된 button으로 렌더된다 — no-op div 대체 (AC 4)", () => {
    render(<FeedVideoCard video={VIDEO} mine={false} onSelect={() => {}} />);

    expect(
      screen.getByRole("button", { name: /거리 야경 감성 스팟/ }),
    ).toBeTruthy();
  });

  it("클릭 시 onSelect가 호출된다 (AC 4)", () => {
    const onSelect = vi.fn();
    render(<FeedVideoCard video={VIDEO} mine onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /거리 야경 감성 스팟/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
