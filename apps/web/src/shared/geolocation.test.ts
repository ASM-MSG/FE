import { afterEach, describe, expect, it, vi } from "vitest";
import { SEOMYEON_CENTER, getCurrentPosition } from "./geolocation";

const originalGeolocation = navigator.geolocation;

const setGeolocation = (value: unknown) => {
  Object.defineProperty(navigator, "geolocation", {
    value,
    configurable: true,
    writable: true,
  });
};

afterEach(() => {
  setGeolocation(originalGeolocation);
  vi.restoreAllMocks();
});

describe("getCurrentPosition (L6)", () => {
  it("위치 권한 거부/조회 실패 시 서면 중심 좌표를 폴백으로 반환한다", async () => {
    setGeolocation({
      getCurrentPosition: (
        _success: PositionCallback,
        error: PositionErrorCallback,
      ) => {
        error({ code: 1, message: "denied" } as GeolocationPositionError);
      },
    });

    await expect(getCurrentPosition()).resolves.toEqual(SEOMYEON_CENTER);
    expect(SEOMYEON_CENTER).toEqual({ lat: 35.1579, lng: 129.0594 });
  });

  it("geolocation API 자체가 없으면 서면 중심 좌표를 반환한다", async () => {
    setGeolocation(undefined);

    await expect(getCurrentPosition()).resolves.toEqual(SEOMYEON_CENTER);
  });

  it("위치 허용 시 조회된 좌표를 반환한다", async () => {
    setGeolocation({
      getCurrentPosition: (success: PositionCallback) => {
        success({
          coords: { latitude: 35.1234, longitude: 129.0678 },
        } as GeolocationPosition);
      },
    });

    await expect(getCurrentPosition()).resolves.toEqual({
      lat: 35.1234,
      lng: 129.0678,
    });
  });
});
