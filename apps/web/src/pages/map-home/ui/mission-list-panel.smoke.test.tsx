import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MissionView } from "@/features/map-home/model/mission-view";
import { MissionListPanel } from "./MissionListPanel";

/**
 * 목록 패널 스모크 — "부재료 실패가 목록을 가리지 않는다"는 계약만 고정한다 (리뷰 반영).
 * 카드 내부 문구·스타일은 자주 바뀌므로 단정하지 않는다.
 */
const view = (missionId: number, title: string): MissionView =>
  ({
    missionId,
    title,
    placeName: null,
    dto: {
      missionId,
      title,
      startAt: null,
      endAt: null,
      operationTime: null,
      imageUrl: null,
      placeName: null,
    },
    shape: {
      kind: "none",
      points: [],
      gridIds: new Set(),
      spots: [],
      line: null,
      polygon: [],
      bbox: null,
    },
    progress: { done: 0, total: 1, completed: false },
    status: { kind: "ongoing", label: "진행 중" },
  }) as unknown as MissionView;

const renderPanel = (props: Partial<Parameters<typeof MissionListPanel>[0]>) =>
  render(
    <MissionListPanel
      views={[view(1, "송도해변축제")]}
      theme="festival"
      isPending={false}
      isError={false}
      progressFailed={false}
      onRetry={vi.fn()}
      onSelect={vi.fn()}
      onHover={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  );

afterEach(() => cleanup());

describe("지역축제 목록 패널 — 실패 표면 분리 (리뷰 반영)", () => {
  it("진행도만 실패하면 안내를 얹되 목록은 그대로 보여준다", () => {
    renderPanel({ progressFailed: true });

    expect(screen.getByText(/진행도를 불러오지 못했어요/)).toBeTruthy();
    // 목록이 가려지지 않는다 — 이게 이 스모크의 핵심
    expect(screen.getByRole("button", { name: /송도해변축제/ })).toBeTruthy();
    expect(screen.queryByText(/목록을 불러오지 못했어요/)).toBeNull();
  });

  it("목록 자체가 실패하면 목록을 감추고 목록 실패로 알린다", () => {
    renderPanel({ isError: true });

    expect(screen.getByText(/지역축제 목록을 불러오지 못했어요/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /송도해변축제/ })).toBeNull();
  });

  it("둘 다 정상이면 안내 없이 목록만 보여준다 (경계)", () => {
    renderPanel({});

    expect(screen.getByRole("button", { name: /송도해변축제/ })).toBeTruthy();
    expect(screen.queryByText(/불러오지 못했어요/)).toBeNull();
  });
});
