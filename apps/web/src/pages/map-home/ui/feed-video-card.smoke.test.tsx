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
  thumbnailUrl: "data:,thumb",
  uploaderHandle: "@busan.vlog",
  videoSrc: "https://mdn.github.io/shared-assets/videos/flower.mp4",
};

describe("피드 영상 카드 button화 (3차 AC 4)", () => {
  afterEach(() => {
    cleanup();
  });

  it("접근성 이름에 영상 제목이 포함된 button으로 렌더된다 — no-op div 대체 (AC 4)", () => {
    render(
      <FeedVideoCard
        video={VIDEO}
        mine={false}
        position={1}
        onSelect={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: /거리 야경 감성 스팟/ }),
    ).toBeTruthy();
  });

  it("클릭 시 onSelect가 호출된다 (AC 4)", () => {
    const onSelect = vi.fn();
    render(
      <FeedVideoCard video={VIDEO} mine position={1} onSelect={onSelect} />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /거리 야경 감성 스팟/ }),
    );

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

/**
 * MSG-464 썸네일 폴백 계약 — 로드 에러 시 깨진 이미지 대신 기본 이미지로 전환되고,
 * 처리 상태 라벨은 여전히 thumbnailUrl === null일 때만 표시된다(MSG-326 기준 11 보존).
 * 폴백 상태 전이 자체(에러 리셋 등)는 ui-web Thumbnail 스모크가 덮는다.
 */
describe("피드 영상 카드 썸네일 폴백 (MSG-464)", () => {
  afterEach(() => {
    cleanup();
  });

  it("이미지 로드가 실패하면 기본 이미지로 대체된다 — 깨진 이미지가 남지 않는다 (기준 4)", () => {
    render(
      <FeedVideoCard
        video={VIDEO}
        mine={false}
        position={1}
        onSelect={() => {}}
      />,
    );

    // 카드 썸네일은 장식 이미지(alt="") — presentation role로 조회한다
    fireEvent.error(screen.getByRole("presentation"));

    expect(screen.queryByRole("presentation")).toBeNull();
  });

  it("로드 에러 폴백에는 처리 상태 라벨이 붙지 않는다 — 라벨은 thumbnailUrl null 전용 (기준 9)", () => {
    render(
      <FeedVideoCard
        video={VIDEO}
        mine={false}
        position={1}
        onSelect={() => {}}
      />,
    );

    fireEvent.error(screen.getByRole("presentation"));

    expect(screen.queryByText("처리 중")).toBeNull();
    expect(screen.queryByText("처리 실패")).toBeNull();
  });

  it("thumbnailUrl이 null이면 처리 상태 라벨이 표시된다 — MSG-326 기준 11 보존 (기준 9)", () => {
    render(
      <FeedVideoCard
        video={{ ...VIDEO, thumbnailUrl: null }}
        mine
        position={1}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("처리 중")).toBeTruthy();
  });
});
