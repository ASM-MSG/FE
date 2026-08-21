import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChipListPanel } from "./ChipListPanel";
import { HotRegionPanel } from "./HotRegionPanel";

/**
 * 패널 로딩 게이트 스모크 (MSG-403 후속) — "요소가 전부 준비되기 전에는 도트 로더만,
 * 준비되면 한번에" 계약을 고정한다. 로더는 role="status"로 낭독된다(a11y).
 */
afterEach(cleanup);

const emptySummary = {
  hotGridIds: [],
  cells: [],
  videos: [],
  stats: { myVideoCount: 0, recentCount: 0, videoCount: 0, viewCount: 0 },
  isPending: true,
  isError: false,
  retry: () => {},
};

describe("좌측 패널 로딩 게이트 (MSG-403 후속)", () => {
  it("칩 목록이 준비되기 전에는 도트 로더만 보이고 헤더 개수도 뜨지 않는다", () => {
    render(
      <ChipListPanel
        theme="festival"
        count={0}
        isPending
        isError={false}
        errorMessage="지역축제 목록을 불러오지 못했어요"
        emptyMessage="지금 진행 중인 축제가 없어요"
        onRetry={vi.fn()}
        onClose={vi.fn()}
      >
        <ul />
      </ChipListPanel>,
    );

    expect(
      screen.getByRole("status", { name: "목록 불러오는 중" }),
    ).toBeTruthy();
    expect(screen.queryByText(/0개/)).toBeNull();
  });

  it("핫구역 요약이 준비되기 전에는 도트 로더만 보이고 스탯이 0으로 뜨지 않는다", () => {
    render(
      <HotRegionPanel
        summary={emptySummary}
        regionName="부전제1동"
        onVideoSelect={vi.fn()}
        onViewAll={vi.fn()}
        onClose={vi.fn()}
        onUpload={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("status", { name: "핫구역 요약 불러오는 중" }),
    ).toBeTruthy();
    expect(screen.queryByText(/내 영상 0개/)).toBeNull();
  });

  it("준비가 끝나면 로더 없이 본문이 한번에 보인다", () => {
    render(
      <HotRegionPanel
        summary={{ ...emptySummary, isPending: false }}
        regionName="부전제1동"
        onVideoSelect={vi.fn()}
        onViewAll={vi.fn()}
        onClose={vi.fn()}
        onUpload={vi.fn()}
      />,
    );

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText(/내 영상 0개/)).toBeTruthy();
  });
});
