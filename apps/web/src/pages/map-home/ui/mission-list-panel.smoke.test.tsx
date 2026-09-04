import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_STORAGE_KEY,
  useAuthStore,
} from "@/features/auth/model/auth-store";
import type {
  CourseView,
  MissionView,
} from "@/features/map-home/model/mission-view";
import { webStorage } from "@/shared/storage";
import { renderWithProviders } from "@/test/render-with-providers";
import { CourseListPanel } from "./CourseListPanel";
import { MissionListPanel } from "./MissionListPanel";

/**
 * 목록 패널 스모크 — "부재료 실패가 목록을 가리지 않는다"는 계약만 고정한다 (리뷰 반영).
 * 카드 내부 문구·스타일은 자주 바뀌므로 단정하지 않는다.
 * MSG-555: 패널이 콘솔 진입 배너(라우터 Link)를 품게 되어 렌더를 라우터 프로바이더로
 * 감쌌다 — 기존 단정은 그대로다. 배너의 문구·목적지 계약은
 * console-entry-banner.smoke.test.tsx 소관이고, 여기서는 "세 표면에 붙어 있는가"만 본다.
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
  renderWithProviders(
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

const courseView = {
  missionId: 3,
  title: "남파랑길 3코스",
  placeName: null,
  dto: { missionId: 3, title: "남파랑길 3코스", placeName: null },
  shape: {
    kind: "none",
    points: [],
    gridIds: new Set<string>(),
    spots: [],
    line: null,
    polygon: [],
    bbox: null,
  },
  progress: { done: 0, total: 3, completed: false },
  status: { kind: "always", label: "상시" },
  path: [],
  loop: false,
  spots: [],
} as unknown as CourseView;

const renderCourseList = (progressFailed: boolean, progressLocked = false) =>
  renderWithProviders(
    <CourseListPanel
      views={[courseView]}
      isPending={false}
      isError={false}
      progressFailed={progressFailed}
      progressLocked={progressLocked}
      onRetry={vi.fn()}
      onSelect={vi.fn()}
      onHover={vi.fn()}
      onClose={vi.fn()}
    />,
  );

describe("경로추천 목록 카드 — 진행도 실패 표기 (리뷰 반영)", () => {
  it("진행도가 실패하면 카드도 수치를 주장하지 않는다", () => {
    renderCourseList(true);

    expect(screen.getByText("방문 확인 불가")).toBeTruthy();
    expect(screen.queryByText("0/3곳 방문")).toBeNull();
    // 목록은 그대로 보인다
    expect(screen.getByRole("button", { name: /남파랑길 3코스/ })).toBeTruthy();
  });

  it("정상이면 수치를 보여준다 (경계)", () => {
    renderCourseList(false);

    expect(screen.getByText("0/3곳 방문")).toBeTruthy();
    expect(screen.queryByText("방문 확인 불가")).toBeNull();
  });

  it("비로그인이면 카드의 방문 수를 숨긴다 — 실패 문구도 쓰지 않는다 (MSG-463 확정 2)", () => {
    renderCourseList(false, true);

    // 목록·카드는 그대로 보인다 (숨기는 건 개인 진행 표기뿐)
    expect(screen.getByRole("button", { name: /남파랑길 3코스/ })).toBeTruthy();
    expect(screen.queryByText("0/3곳 방문")).toBeNull();
    // 익명은 조회 실패가 아니라 조회 대상이 아님 — "확인 불가" 문구 금지 (기각 대안의 회귀 방지)
    expect(screen.queryByText("방문 확인 불가")).toBeNull();
  });
});

describe("콘솔 진입 배너가 칩 목록 패널 3표면에 붙는다 (MSG-555 AC 3·4·6·7)", () => {
  const BANNER_HEAD = "여기 없는 행사를 운영하시나요?";

  const setSession = (loggedIn: boolean) =>
    useAuthStore.setState({
      accessToken: loggedIn ? "token" : null,
      isAuthenticated: loggedIn,
    });

  beforeEach(() => setSession(false));

  afterEach(() => {
    setSession(false);
    webStorage.removeItem(AUTH_STORAGE_KEY);
  });

  it.each([
    ["비로그인", false],
    ["로그인", true],
  ])(
    "지역축제 목록 패널 목록 끝에 배너가 렌더된다 — %s 세션 (AC 3·6)",
    (_label, loggedIn) => {
      setSession(loggedIn as boolean);

      renderPanel({ theme: "festival" });

      expect(screen.getByText(BANNER_HEAD)).toBeTruthy();
    },
  );

  it("팝업스토어 목록 패널에도 같은 배너가 렌더된다 (AC 3)", () => {
    renderPanel({ theme: "popup" });

    expect(screen.getByText(BANNER_HEAD)).toBeTruthy();
  });

  it("경로추천 목록 패널에도 **같은 배너 컴포넌트**가 렌더된다 (AC 4)", () => {
    renderCourseList(false);

    expect(screen.getByText(BANNER_HEAD)).toBeTruthy();
  });

  it.each([
    ["비로그인", false],
    ["로그인", true],
  ])("빈 목록에도 배너가 노출된다 — %s 세션 (AC 6·7)", (_label, loggedIn) => {
    setSession(loggedIn as boolean);

    renderPanel({ views: [], theme: "festival" });

    expect(screen.getByText("지금 진행 중인 지역축제가 없어요")).toBeTruthy();
    expect(screen.getByText(BANNER_HEAD)).toBeTruthy();
  });

  it("목록 실패 상태에도 배너가 노출된다 (AC 7 — 추정 2 승인)", () => {
    renderPanel({ isError: true });

    expect(screen.getByText(/지역축제 목록을 불러오지 못했어요/)).toBeTruthy();
    expect(screen.getByText(BANNER_HEAD)).toBeTruthy();
  });
});
