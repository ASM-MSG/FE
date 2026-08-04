import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEOMYEON_CENTER, resolveMapCenter } from "./geolocation";

/**
 * AC 2: 지도 중심 결정 — 권한 승인+조회 성공 시 현재 위치, 거부·실패 시 서면 폴백.
 * expo-location은 네이티브 모듈이라 vitest에서 로드 불가 — 모킹으로 순수 로직만
 * 검증한다 (onboarding-storage.test의 AsyncStorage 모킹 선례, MSG-292 확정 4).
 */
const control = vi.hoisted(() => ({
  granted: true,
  coords: { latitude: 35.2001, longitude: 129.1002 },
  permissionError: false,
  positionError: false,
}));

vi.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: async () => {
    if (control.permissionError) throw new Error("permission unavailable");
    return { granted: control.granted };
  },
  getCurrentPositionAsync: async () => {
    if (control.positionError) throw new Error("position unavailable");
    return { coords: control.coords };
  },
}));

describe("resolveMapCenter (AC 2)", () => {
  beforeEach(() => {
    control.granted = true;
    control.coords = { latitude: 35.2001, longitude: 129.1002 };
    control.permissionError = false;
    control.positionError = false;
  });

  it("위치 권한 승인 + 조회 성공 시 현재 위치를 반환한다", async () => {
    await expect(resolveMapCenter()).resolves.toEqual({
      lat: 35.2001,
      lng: 129.1002,
    });
  });

  it("권한 거부 시 서면 중심(35.1579, 129.0594)을 반환한다", async () => {
    control.granted = false;
    await expect(resolveMapCenter()).resolves.toEqual(SEOMYEON_CENTER);
  });

  it("위치 조회 실패 시 서면 중심으로 폴백한다", async () => {
    control.positionError = true;
    await expect(resolveMapCenter()).resolves.toEqual(SEOMYEON_CENTER);
  });

  it("권한 요청 자체가 실패해도 reject 없이 서면 중심으로 폴백한다", async () => {
    control.permissionError = true;
    await expect(resolveMapCenter()).resolves.toEqual(SEOMYEON_CENTER);
  });

  it("서면 폴백 좌표는 웹 shared/geolocation과 동일한 35.1579/129.0594다", () => {
    expect(SEOMYEON_CENTER).toEqual({ lat: 35.1579, lng: 129.0594 });
  });
});
