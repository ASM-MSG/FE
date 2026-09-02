import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GRID_MIN_ZOOM } from "@/features/map-home/model/grid-overlay";
import { useMapFocusEntry } from "./use-map-focus-entry";

const routerAt =
  (route: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );

describe("useMapFocusEntry — focus 딥링크 진입 (AC 6)", () => {
  it("focus 좌표로 진입하면 그 좌표로 이동하고 격자가 보이는 줌으로 맞춘다 (AC 6)", () => {
    const moveTo = vi.fn();
    const zoomTo = vi.fn();

    renderHook(() => useMapFocusEntry({ moveTo, zoomTo }), {
      wrapper: routerAt("/?focus=35.1579,129.0594"),
    });

    expect(moveTo).toHaveBeenCalledWith({ lat: 35.1579, lng: 129.0594 });
    expect(zoomTo).toHaveBeenCalledWith(GRID_MIN_ZOOM);
  });

  it("focus 파라미터가 없으면 지도를 건드리지 않는다 — 회귀 0 (AC 6)", () => {
    const moveTo = vi.fn();
    const zoomTo = vi.fn();

    renderHook(() => useMapFocusEntry({ moveTo, zoomTo }), {
      wrapper: routerAt("/"),
    });

    expect(moveTo).not.toHaveBeenCalled();
    expect(zoomTo).not.toHaveBeenCalled();
  });

  it("focus 값이 잘못됐으면 지도를 건드리지 않는다 — 회귀 0 (AC 6)", () => {
    const moveTo = vi.fn();
    const zoomTo = vi.fn();

    renderHook(() => useMapFocusEntry({ moveTo, zoomTo }), {
      wrapper: routerAt("/?focus=서면"),
    });

    expect(moveTo).not.toHaveBeenCalled();
    expect(zoomTo).not.toHaveBeenCalled();
  });

  it("리렌더가 반복돼도 진입 이동은 한 번만 실행한다 (AC 6)", () => {
    const moveTo = vi.fn();
    const zoomTo = vi.fn();

    const { rerender } = renderHook(
      () => useMapFocusEntry({ moveTo, zoomTo }),
      { wrapper: routerAt("/?focus=35.1579,129.0594") },
    );
    rerender();
    rerender();

    expect(moveTo).toHaveBeenCalledTimes(1);
  });
});
