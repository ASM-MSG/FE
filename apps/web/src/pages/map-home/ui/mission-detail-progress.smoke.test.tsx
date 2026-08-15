import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  CourseView,
  MissionView,
} from "@/features/map-home/model/mission-view";
import type { MissionVideosResult } from "@/features/map-home/model/use-mission-videos-query";
import { CourseDetailPanel } from "./CourseDetailPanel";
import { MissionDetailPanel } from "./MissionDetailPanel";

/**
 * 상세 패널 스모크 — "진행도 조회가 실패하면 수치를 주장하지 않는다"만 고정한다 (리뷰 반영).
 * 목록에서 안내를 봤어도 상세에서 다시 아무 표시 없는 `0/N`을 보면 같은 오해가 반복된다.
 */
const EMPTY_SHAPE = {
  kind: "none",
  points: [],
  gridIds: new Set<string>(),
  spots: [],
  line: null,
  polygon: [],
  bbox: null,
};

const missionView = {
  missionId: 1,
  title: "송도해변축제",
  placeName: null,
  dto: {
    missionId: 1,
    title: "송도해변축제",
    startAt: null,
    endAt: null,
    operationTime: null,
    imageUrl: null,
    placeName: null,
    distanceMeters: null,
    durationMinutes: null,
  },
  shape: EMPTY_SHAPE,
  progress: { done: 0, total: 1, completed: false },
  status: { kind: "ongoing", label: "진행 중" },
} as unknown as MissionView;

const courseView = {
  ...missionView,
  missionId: 3,
  title: "남파랑길 3코스",
  progress: { done: 0, total: 3, completed: false },
  path: [],
  loop: false,
  spots: [
    {
      gridId: "16858_11420",
      position: { lat: 35.15, lng: 129.05 },
      order: 1,
      visited: false,
    },
  ],
} as unknown as CourseView;

const emptyFeed: MissionVideosResult = {
  items: [],
  isPending: false,
  isError: false,
  retry: vi.fn(),
};

afterEach(() => cleanup());

describe("축제·팝업 상세 — 진행도 실패 표기 (리뷰 반영)", () => {
  const renderPanel = (progressFailed: boolean) =>
    render(
      <MissionDetailPanel
        view={missionView}
        theme="festival"
        videos={emptyFeed}
        progressFailed={progressFailed}
        onVideoSelect={vi.fn()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    );

  it("진행도 조회가 실패하면 0/N 대신 확인 불가로 적는다", () => {
    renderPanel(true);

    expect(screen.getByText("확인 불가")).toBeTruthy();
    expect(screen.queryByText("0/1칸")).toBeNull();
  });

  it("정상이면 수치를 그대로 보여준다 (경계)", () => {
    renderPanel(false);

    expect(screen.getByText("0/1칸")).toBeTruthy();
    expect(screen.queryByText("확인 불가")).toBeNull();
  });
});

describe("코스 상세 — 진행도 실패 표기 (리뷰 반영)", () => {
  const renderPanel = (progressFailed: boolean) =>
    render(
      <CourseDetailPanel
        view={courseView}
        spotNames={new Map([["16858_11420", "남포 G-4"]])}
        progressFailed={progressFailed}
        onSpotSelect={vi.fn()}
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    );

  it("진행도 조회가 실패하면 내 진행도, 스팟 방문 여부도 주장하지 않는다", () => {
    renderPanel(true);

    expect(screen.getByText("확인 불가")).toBeTruthy();
    expect(screen.queryByText("0/3곳")).toBeNull();
    // 전 스팟이 미방문으로 폴백하므로 라벨 자체를 생략한다
    expect(screen.queryByText("미방문")).toBeNull();
  });

  it("정상이면 수치와 방문 여부를 보여준다 (경계)", () => {
    renderPanel(false);

    expect(screen.getByText("0/3곳")).toBeTruthy();
    expect(screen.getByText("미방문")).toBeTruthy();
  });
});
