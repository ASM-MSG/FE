import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ThemeFeed } from "@/features/map-home/model/theme-feed";
import { ThemeFeedPanel } from "./ThemeFeedPanel";

/**
 * 테마 피드 패널 스모크 (MSG-277 AC 2·7, 확정 4, 추정 6).
 * 헤더 개수·셀 섹션 헤더·CTA 부재·Escape 배선(입력 타깃 무시 계약 포함)을 고정한다.
 * 피드 파생 규칙 자체는 theme-feed.test.ts가 커버 — 여기서는 렌더 배선만 단정한다.
 * MSG-277 3차: 카드 button화(3차 AC 4)로 "버튼 전무" 단정을 "카드 재생 버튼 외 버튼 없음"으로
 * 재작성 — 원 의도(순수 탐색 피드: 하단 CTA·"전체 보기" 없음)는 보존 (스펙 승인 예외).
 */

/** 고정 픽스처 — 서면 목 관례 (부산 서면 MVP). totalCount(3)는 나열 영상 수 합과 일치 (AC 2) */
const FEED: ThemeFeed = {
  theme: "hot",
  sections: [
    {
      cellId: "A-14",
      label: "서면 A-14",
      videos: [
        {
          videoId: 101,
          title: "표본 영상",
          viewCount: 12000,
          recordedAt: "2026-07-29T12:00:00.000Z",
          durationSec: 30,
          mine: true,
        },
        {
          videoId: 102,
          title: "표본 영상",
          viewCount: 8410,
          recordedAt: "2026-07-28T12:00:00.000Z",
          durationSec: 24,
          uploaderHandle: "@busan.vlog",
          mine: false,
        },
      ],
    },
    {
      cellId: "A-15",
      label: "전포 A-15",
      videos: [
        {
          videoId: 201,
          title: "표본 영상",
          viewCount: 640,
          recordedAt: "2026-07-27T12:00:00.000Z",
          durationSec: 26,
          uploaderHandle: "@jeonpo_alley",
          mine: false,
        },
      ],
    },
  ],
  totalCount: 3,
};

describe("테마 피드 패널 스모크", () => {
  afterEach(() => {
    cleanup();
  });

  it("헤더에 테마 배지와 실제 나열 영상 총수가 보인다 (AC 2)", () => {
    render(
      <ThemeFeedPanel
        feed={FEED}
        onVideoSelect={() => {}}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("핫구역")).toBeTruthy();
    expect(screen.getByText("· 3개")).toBeTruthy();
  });

  it("셀 라벨 섹션 헤더가 보인다 — 피드 내 셀 식별 (AC 7)", () => {
    render(
      <ThemeFeedPanel
        feed={FEED}
        onVideoSelect={() => {}}
        onClose={() => {}}
      />,
    );

    // 접근성 이름에 섹션 개수("· N개")가 합쳐진다 — 리뷰 반영(헤더 위계 승격)으로 부분 일치 단정
    expect(screen.getByRole("heading", { name: /서면 A-14/ })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /전포 A-15/ })).toBeTruthy();
  });

  it("버튼은 카드 재생 버튼뿐이고 '전체 보기'가 없다 — 순수 탐색 피드 (확정 4, 3차 AC 4 button화 반영 재작성)", () => {
    render(
      <ThemeFeedPanel
        feed={FEED}
        onVideoSelect={() => {}}
        onClose={() => {}}
      />,
    );

    // 나열 영상 3개 = 재생 버튼 3개 — 그 외 버튼(하단 CTA 등)이 없음을 총수로 고정
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.getAttribute("aria-label")).toMatch(/재생$/);
    }
    expect(screen.queryByText("전체 보기")).toBeNull();
  });

  it("일반 타깃(body)의 Escape는 피드를 닫고, input 타깃은 무시한다 (추정 6 — 상세 패널 Escape 계약 공유)", () => {
    const onClose = vi.fn();
    render(
      <>
        <input aria-label="검색어" />
        <ThemeFeedPanel
          feed={FEED}
          onVideoSelect={() => {}}
          onClose={onClose}
        />
      </>,
    );

    fireEvent.keyDown(screen.getByLabelText("검색어"), { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
