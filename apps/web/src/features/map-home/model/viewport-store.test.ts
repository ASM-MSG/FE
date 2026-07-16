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
      center: { lat: 37.5, lng: 127.0 },
      zoom: 4,
      bounds: {
        sw: { lat: 37.4, lng: 126.9 },
        ne: { lat: 37.6, lng: 127.1 },
      },
    });

    const state = useViewportStore.getState();
    expect(state.center).toEqual({ lat: 37.5, lng: 127.0 });
    expect(state.zoom).toBe(4);
    expect(state.bounds).toEqual({
      sw: { lat: 37.4, lng: 126.9 },
      ne: { lat: 37.6, lng: 127.1 },
    });
  });
});
