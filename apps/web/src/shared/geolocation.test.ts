import { afterEach, describe, expect, it, vi } from "vitest";
import { setGeolocation } from "@/test/geolocation";
import {
  SEOMYEON_CENTER,
  getCurrentPosition,
  getCurrentPositionOrNull,
} from "./geolocation";

const originalGeolocation = navigator.geolocation;

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

/**
 * MSG-489 A1 — 폴백을 씌우지 않는 가산 어댑터.
 * 경로추천 출발지 판정은 "거부·미확보"와 "서면에 있다"를 구분해야 한다:
 * 기존 폴백은 MVP 지역(서면)이라 거부한 사용자도 뷰포트 안으로 오판정된다.
 */
describe("getCurrentPositionOrNull (MSG-489 A1)", () => {
  it("위치 권한 거부/조회 실패 시 null을 반환한다 — 서면 폴백을 씌우지 않는다", async () => {
    setGeolocation({
      getCurrentPosition: (
        _success: PositionCallback,
        error: PositionErrorCallback,
      ) => {
        error({ code: 1, message: "denied" } as GeolocationPositionError);
      },
    });

    await expect(getCurrentPositionOrNull()).resolves.toBeNull();
  });

  it("geolocation API 자체가 없으면 null을 반환한다", async () => {
    setGeolocation(undefined);

    await expect(getCurrentPositionOrNull()).resolves.toBeNull();
  });

  it("위치 허용 시 조회된 좌표를 반환한다", async () => {
    setGeolocation({
      getCurrentPosition: (success: PositionCallback) => {
        success({
          coords: { latitude: 35.1234, longitude: 129.0678 },
        } as GeolocationPosition);
      },
    });

    await expect(getCurrentPositionOrNull()).resolves.toEqual({
      lat: 35.1234,
      lng: 129.0678,
    });
  });
});
