import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SEOMYEON_CENTER } from "@/shared/geolocation";
import { setGeolocation } from "@/test/geolocation";
import { useMapEntryCenter } from "./use-map-entry-center";

/**
 * 진입 초기 중심의 focus 우선순위 (MSG-554 AC 6 재작업).
 * 위치는 플랫폼 경계(`navigator.geolocation`)에서만 갈아 끼운다 — 모듈 mock 없음.
 */
const originalGeolocation = navigator.geolocation;

const CURRENT_POSITION = { lat: 35.2003, lng: 129.2003 };

/** 위치 허용 + 호출 관측 — "요청 자체를 하지 않는다"를 단정하기 위해 호출을 기록한다 */
const allowPositionWithSpy = () => {
  const requested = vi.fn();
  setGeolocation({
    getCurrentPosition: (success: PositionCallback) => {
      requested();
      success({
        coords: {
          latitude: CURRENT_POSITION.lat,
          longitude: CURRENT_POSITION.lng,
        },
      } as GeolocationPosition);
    },
  });
  return requested;
};

const routerAt =
  (route: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
  );

describe("useMapEntryCenter — 진입 초기 중심 (AC 6)", () => {
  afterEach(() => {
    setGeolocation(originalGeolocation);
  });

  it("focus 딥링크로 진입하면 현재 위치로 진입 중심을 바꾸지 않는다 — 늦게 도착한 위치가 focus 이동을 덮어쓰지 않게 (AC 6)", async () => {
    const requested = allowPositionWithSpy();

    const { result } = renderHook(() => useMapEntryCenter(), {
      wrapper: routerAt("/?focus=35.158739,129.06293"),
    });
    // 위치 promise가 해소될 틈을 준다 — 그래도 진입 중심이 흔들리면 안 된다
    await act(async () => {});

    expect(requested).not.toHaveBeenCalled();
    expect(result.current).toEqual(SEOMYEON_CENTER);
  });

  it("focus가 없으면 진입 중심이 현재 위치로 갱신된다 — 기존 진입 동작 불변 (AC 6 회귀)", async () => {
    allowPositionWithSpy();

    const { result } = renderHook(() => useMapEntryCenter(), {
      wrapper: routerAt("/"),
    });

    await waitFor(() => expect(result.current).toEqual(CURRENT_POSITION));
  });

  it("focus 값이 잘못됐으면 기존 진입대로 현재 위치를 쓴다 — 회귀 0 (AC 6)", async () => {
    allowPositionWithSpy();

    const { result } = renderHook(() => useMapEntryCenter(), {
      wrapper: routerAt("/?focus=서면"),
    });

    await waitFor(() => expect(result.current).toEqual(CURRENT_POSITION));
  });
});
