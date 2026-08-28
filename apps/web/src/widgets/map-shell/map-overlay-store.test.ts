import { beforeEach, describe, expect, it } from "vitest";
import type { CellCorners } from "@/entities/cell";
import { useMapOverlayStore } from "./map-overlay-store";

/** 축평행 사각 꼭짓점 픽스처 — MSG-357: 셀 기하가 Bounds에서 꼭짓점 4점으로 바뀌었다 */
const cornersOf = (
  sw: { lat: number; lng: number },
  ne: { lat: number; lng: number },
): CellCorners => [
  sw,
  { lat: sw.lat, lng: ne.lng },
  ne,
  { lat: ne.lat, lng: sw.lng },
];

const OVERLAYS = [
  {
    id: "A-14",
    corners: cornersOf(
      { lat: 35.155, lng: 129.056 },
      { lat: 35.159, lng: 129.061 },
    ),
  },
  {
    id: "B-07",
    corners: cornersOf(
      { lat: 35.161, lng: 129.058 },
      { lat: 35.166, lng: 129.063 },
    ),
  },
];

describe("useMapOverlayStore — 수집 오버레이 게시/해제 (AC 9·11)", () => {
  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
  });

  it("초기 상태는 오버레이 없음(빈 목록)이다 — 도감 밖 섹션의 기본값", () => {
    expect(useMapOverlayStore.getState().cells).toEqual([]);
  });

  it("setCells로 수집 오버레이 목록을 게시한다 (AC 9)", () => {
    useMapOverlayStore.getState().setCells(OVERLAYS);

    expect(useMapOverlayStore.getState().cells).toEqual(OVERLAYS);
  });

  it("clear로 오버레이를 해제한다 — 도감 이탈 시 지도에서 사라진다 (AC 11)", () => {
    useMapOverlayStore.getState().setCells(OVERLAYS);
    useMapOverlayStore.getState().clear();

    expect(useMapOverlayStore.getState().cells).toEqual([]);
  });
});

describe("useMapOverlayStore — 셀 클릭 핸들러 슬롯 (MSG-122 AC 14·18, R3)", () => {
  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
  });

  it("초기 상태는 핸들러 없음(null)이다 — 표시 전용 기존 동작과 동일(R3)", () => {
    expect(useMapOverlayStore.getState().onCellClick).toBeNull();
  });

  it("setOnCellClick으로 셀 클릭 핸들러를 등록한다", () => {
    const handler = () => undefined;
    useMapOverlayStore.getState().setOnCellClick(handler);

    expect(useMapOverlayStore.getState().onCellClick).toBe(handler);
  });

  it("clear는 오버레이와 함께 핸들러도 해제한다 — 도감 이탈 시 지도는 표시 전용으로 복귀", () => {
    useMapOverlayStore.getState().setCells(OVERLAYS);
    useMapOverlayStore.getState().setOnCellClick(() => undefined);
    useMapOverlayStore.getState().clear();

    expect(useMapOverlayStore.getState().cells).toEqual([]);
    expect(useMapOverlayStore.getState().onCellClick).toBeNull();
  });
});

describe("useMapOverlayStore — 섹션 게시 전용 (MSG-263 AC 18, D9)", () => {
  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
  });

  it("스토어는 격자선·상시 점령 셀을 소유하지 않는다 — 격자 상시화는 MapShell 직접 파생 (D9)", () => {
    expect("gridLines" in useMapOverlayStore.getState()).toBe(false);
    expect("setGridLines" in useMapOverlayStore.getState()).toBe(false);
  });

  it("clear는 섹션 게시(cells·routes·labels·onCellClick)만 초기화한다 — 스토어 상태 전부가 섹션 게시 층이다", () => {
    useMapOverlayStore.getState().setCells(OVERLAYS);
    useMapOverlayStore.getState().setOnCellClick(() => undefined);
    useMapOverlayStore.getState().clear();

    // clear 결과 = 초기 상태 전체 (섹션 게시 4슬롯 외 잔여 상태 없음)
    expect(useMapOverlayStore.getState().cells).toEqual([]);
    expect(useMapOverlayStore.getState().routes).toEqual([]);
    expect(useMapOverlayStore.getState().labels).toEqual([]);
    expect(useMapOverlayStore.getState().onCellClick).toBeNull();
  });
});

describe("useMapOverlayStore — 스타일드 셀·경로 슬롯 (MSG-252 AC 6·7·8)", () => {
  const ROUTE = {
    id: "3",
    path: [
      { lat: 35.1573, lng: 129.0586 },
      { lat: 35.1552, lng: 129.0633 },
    ],
    waypoints: [
      { seq: 1, position: { lat: 35.1573, lng: 129.0586 } },
      { seq: 2, position: { lat: 35.1552, lng: 129.0633 } },
    ],
    color: "#34C759",
  };

  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
  });

  it("초기 상태는 경로 없음(빈 배열)이다 — 기본 상태 지도는 셀 오버레이만 (AC 2)", () => {
    expect(useMapOverlayStore.getState().routes).toEqual([]);
  });

  it("setCells는 스타일 필드(색·빗금)를 그대로 게시한다 — 미지정 셀은 기존 primary 렌더 유지 (AC 6·7)", () => {
    const styled = [
      { ...OVERLAYS[0], color: "#FF3B30", hatched: true },
      OVERLAYS[1],
    ];
    useMapOverlayStore.getState().setCells(styled);

    expect(useMapOverlayStore.getState().cells).toEqual(styled);
  });

  it("setRoutes로 경로 오버레이를 게시하고 빈 배열로 해제한다 (AC 8)", () => {
    useMapOverlayStore.getState().setRoutes([ROUTE]);
    expect(useMapOverlayStore.getState().routes).toEqual([ROUTE]);

    useMapOverlayStore.getState().setRoutes([]);
    expect(useMapOverlayStore.getState().routes).toEqual([]);
  });

  it("코스가 여럿이면 라인도 여럿 게시된다 (MSG-395 AC 21)", () => {
    useMapOverlayStore.getState().setRoutes([ROUTE, { ...ROUTE, id: "4" }]);

    expect(useMapOverlayStore.getState().routes.map((r) => r.id)).toEqual([
      "3",
      "4",
    ]);
  });

  it("setLabels로 이름표를 게시한다 (MSG-395 AC 16)", () => {
    const label = {
      id: "3",
      position: { lat: 35.1573, lng: 129.0586 },
      text: "남파랑길 3코스",
      color: "#34C759",
    };
    useMapOverlayStore.getState().setLabels([label]);

    expect(useMapOverlayStore.getState().labels).toEqual([label]);
  });

  it("clear는 경로·이름표도 함께 해제한다 — 홈 이탈 시 지도는 무오버레이로 복귀", () => {
    useMapOverlayStore.getState().setRoutes([ROUTE]);
    useMapOverlayStore.getState().setLabels([
      {
        id: "3",
        position: { lat: 35.1573, lng: 129.0586 },
        text: "코스",
        color: "#34C759",
      },
    ]);
    useMapOverlayStore.getState().clear();

    expect(useMapOverlayStore.getState().routes).toEqual([]);
    expect(useMapOverlayStore.getState().labels).toEqual([]);
  });
});

/**
 * 경유지 클릭 핸들러 슬롯 (MSG-488) — AI 경로추천이 마커→카드 연동을 배선한다.
 * 미등록(null)이면 기존 코스 경유지 마커는 종전대로 비클릭이다.
 */
describe("useMapOverlayStore — 경유지 클릭 핸들러 슬롯 (MSG-488 S8)", () => {
  beforeEach(() => {
    useMapOverlayStore.setState(useMapOverlayStore.getInitialState(), true);
  });

  it("초기 상태는 핸들러 없음(null)이다 — 코스 경유지 마커는 비클릭 유지", () => {
    expect(useMapOverlayStore.getState().onRouteWaypointClick).toBeNull();
  });

  it("setOnRouteWaypointClick으로 경유지 클릭 핸들러를 등록한다 (S8)", () => {
    const handler = () => undefined;
    useMapOverlayStore.getState().setOnRouteWaypointClick(handler);

    expect(useMapOverlayStore.getState().onRouteWaypointClick).toBe(handler);
  });

  it("clear는 경유지 핸들러도 함께 해제한다 — 섹션 이탈 시 마커가 표시 전용으로 복귀", () => {
    useMapOverlayStore.getState().setOnRouteWaypointClick(() => undefined);
    useMapOverlayStore.getState().clear();

    expect(useMapOverlayStore.getState().onRouteWaypointClick).toBeNull();
  });
});
