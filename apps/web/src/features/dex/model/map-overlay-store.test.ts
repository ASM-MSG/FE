import { beforeEach, describe, expect, it } from "vitest";
import { useMapOverlayStore } from "./map-overlay-store";

const OVERLAYS = [
  {
    id: "A-14",
    bounds: {
      sw: { lat: 37.555, lng: 126.922 },
      ne: { lat: 37.559, lng: 126.927 },
    },
  },
  {
    id: "B-07",
    bounds: {
      sw: { lat: 37.553, lng: 126.899 },
      ne: { lat: 37.558, lng: 126.904 },
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
