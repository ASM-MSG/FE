import { beforeEach, describe, expect, it } from "vitest";
import { useMapOverlayStore } from "./map-overlay-store";

const OVERLAYS = [
  {
    id: "A-14",
    bounds: {
      sw: { lat: 35.155, lng: 129.056 },
      ne: { lat: 35.159, lng: 129.061 },
    },
  },
  {
    id: "B-07",
    bounds: {
      sw: { lat: 35.161, lng: 129.058 },
      ne: { lat: 35.166, lng: 129.063 },
    },
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
