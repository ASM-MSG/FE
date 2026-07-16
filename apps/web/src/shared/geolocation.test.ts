import { afterEach, describe, expect, it, vi } from "vitest";
import { SEOUL_CITY_HALL, getCurrentPosition } from "./geolocation";

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
  it("위치 권한 거부/조회 실패 시 서울 시청 좌표를 폴백으로 반환한다", async () => {
    setGeolocation({
      getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: "denied" } as GeolocationPositionError);
      },
    });

    await expect(getCurrentPosition()).resolves.toEqual(SEOUL_CITY_HALL);
    expect(SEOUL_CITY_HALL).toEqual({ lat: 37.5665, lng: 126.978 });
  });

  it("geolocation API 자체가 없으면 서울 시청 좌표를 반환한다", async () => {
    setGeolocation(undefined);

    await expect(getCurrentPosition()).resolves.toEqual(SEOUL_CITY_HALL);
  });

  it("위치 허용 시 조회된 좌표를 반환한다", async () => {
    setGeolocation({
      getCurrentPosition: (success: PositionCallback) => {
        success({
          coords: { latitude: 37.1234, longitude: 127.5678 },
        } as GeolocationPosition);
      },
    });

    await expect(getCurrentPosition()).resolves.toEqual({
      lat: 37.1234,
      lng: 127.5678,
    });
  });
});
