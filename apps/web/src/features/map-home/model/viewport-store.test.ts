import { beforeEach, describe, expect, it } from "vitest";
import { useViewportStore } from "./viewport-store";

describe("useViewportStore (L5)", () => {
  beforeEach(() => {
    useViewportStore.setState(useViewportStore.getInitialState(), true);
  });

  it("초기 상태로 중심·줌·bounds를 보유한다", () => {
    const state = useViewportStore.getState();

    expect(state.center).toHaveProperty("lat");
    expect(state.center).toHaveProperty("lng");
    expect(typeof state.zoom).toBe("number");
    expect(state.bounds).toBeNull();
  });

  it("setViewport 호출 시 중심(lat/lng)·줌·bounds가 갱신된다", () => {
    useViewportStore.getState().setViewport({
      center: { lat: 35.15, lng: 129.05 },
      zoom: 4,
      bounds: {
        sw: { lat: 35.1, lng: 129.0 },
        ne: { lat: 35.2, lng: 129.1 },
      },
    });

    const state = useViewportStore.getState();
    expect(state.center).toEqual({ lat: 35.15, lng: 129.05 });
    expect(state.zoom).toBe(4);
    expect(state.bounds).toEqual({
      sw: { lat: 35.1, lng: 129.0 },
      ne: { lat: 35.2, lng: 129.1 },
    });
  });
});
