import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SEOMYEON_CENTER,
  resetInFlightPositionForTest,
  resolveMapCenter,
  resolveMapCenterWithPermission,
  toCurrentLocation,
  watchPosition,
  type GeoCoords,
} from "./geolocation";

/**
 * AC 2: 지도 중심 결정 — 권한 승인+조회 성공 시 현재 위치, 거부·실패 시 서면 폴백.
 * expo-location은 네이티브 모듈이라 vitest에서 로드 불가 — 모킹으로 순수 로직만
 * 검증한다 (onboarding-storage.test의 AsyncStorage 모킹 선례, MSG-292 확정 4).
 */
const control = vi.hoisted(() => ({
  granted: true,
  /** MSG-447 — 안드로이드 "다시 묻지 않음" 재현: false면 영구 거부(denied) */
  canAskAgain: true,
  coords: { latitude: 35.2001, longitude: 129.1002 },
  permissionError: false,
  positionError: false,
  /** MSG-317 AC 17 — 위치 픽스 없는 환경 재현: 신규 조회가 영원히 응답하지 않음 */
  positionHang: false,
  /** MSG-317 AC 17 — last-known 위치 (기본 없음 = 기존 케이스 동작 불변) */
  lastKnown: null as { latitude: number; longitude: number } | null,
  /** MSG-317 리뷰 반영 — 연타 누적 감사: getCurrentPositionAsync 발행 횟수 */
  positionCalls: 0,
  /** MSG-565 L3 — watchPositionAsync 발행 횟수·해제 횟수, 구독 프라미스 수동 해소(레이스 재현) */
  watchCalls: 0,
  removeCalls: 0,
  watchError: false,
  resolveWatch: null as null | (() => void),
  watchCallback: null as
    | null
    | ((position: { coords: Record<string, number | null> }) => void),
  watchErrorHandler: null as null | ((error: unknown) => void),
}));

vi.mock("expo-location", () => ({
  Accuracy: { Balanced: 3, High: 4 },
  requestForegroundPermissionsAsync: async () => {
    if (control.permissionError) throw new Error("permission unavailable");
    return { granted: control.granted, canAskAgain: control.canAskAgain };
  },
  getForegroundPermissionsAsync: async () => {
    if (control.permissionError) throw new Error("permission unavailable");
    return { granted: control.granted, canAskAgain: control.canAskAgain };
  },
  watchPositionAsync: (
    _options: unknown,
    callback: (typeof control)["watchCallback"],
    errorHandler: (typeof control)["watchErrorHandler"],
  ) => {
    control.watchCalls += 1;
    if (control.watchError) return Promise.reject(new Error("watch failed"));
    control.watchCallback = callback;
    control.watchErrorHandler = errorHandler;
    return new Promise<{ remove: () => void }>((resolve) => {
      control.resolveWatch = () =>
        resolve({
          remove: () => {
            control.removeCalls += 1;
          },
        });
    });
  },
  getCurrentPositionAsync: async () => {
    control.positionCalls += 1;
    if (control.positionHang) return new Promise(() => {});
    if (control.positionError) throw new Error("position unavailable");
    return { coords: control.coords };
  },
  getLastKnownPositionAsync: async () =>
    control.lastKnown ? { coords: control.lastKnown } : null,
}));

/**
 * single-flight 도입으로 생긴 모듈 레벨 in-flight 상태를 케이스마다 초기화 —
 * 무응답(hang) 케이스가 남긴 프라미스가 후속 케이스로 누출되는 것 방지 (파일 레벨 가산적 훅)
 */
afterEach(() => {
  resetInFlightPositionForTest();
});

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

describe("resolveMapCenter — 신규 조회 타임아웃·last-known 폴백 (MSG-317 AC 17)", () => {
  beforeEach(() => {
    control.granted = true;
    control.permissionError = false;
    control.positionError = false;
    control.positionHang = false;
    control.lastKnown = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    control.positionHang = false;
    control.lastKnown = null;
    vi.useRealTimers();
  });

  /** 무응답 조회에서도 결과를 관찰하기 위한 해상 플래그 — 결함 코드에서는 null로 남는다 */
  const resolvedValueAfterTimeout = async () => {
    let resolved: GeoCoords | null = null;
    void resolveMapCenter().then((value) => {
      resolved = value;
    });
    await vi.advanceTimersByTimeAsync(3100);
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
    return resolved;
  };

  it("신규 조회가 타임아웃되면 last-known 위치로 폴백해 응답한다 (버튼이 죽은 듯 보이지 않게)", async () => {
    control.positionHang = true;
    control.lastKnown = { latitude: 35.1532, longitude: 129.1187 }; // 광안리
    await expect(resolvedValueAfterTimeout()).resolves.toEqual({
      lat: 35.1532,
      lng: 129.1187,
    });
  });

  it("신규 조회가 타임아웃되고 last-known도 없으면 서면 중심으로 폴백한다", async () => {
    control.positionHang = true;
    await expect(resolvedValueAfterTimeout()).resolves.toEqual(SEOMYEON_CENTER);
  });

  it("신규 조회가 실패해도 last-known이 있으면 그 좌표로 폴백한다", async () => {
    control.positionError = true;
    control.lastKnown = { latitude: 35.1532, longitude: 129.1187 };
    await expect(resolveMapCenter()).resolves.toEqual({
      lat: 35.1532,
      lng: 129.1187,
    });
  });

  it("신규 조회 성공 시 타임아웃과 무관하게 현재 위치를 즉시 반환한다 (기존 성공 경로 보존)", async () => {
    control.coords = { latitude: 35.2001, longitude: 129.1002 };
    await expect(resolveMapCenter()).resolves.toEqual({
      lat: 35.2001,
      lng: 129.1002,
    });
  });
});

describe("resolveMapCenter — 진행 중 신규 조회 single-flight 공유 (MSG-317 리뷰 반영)", () => {
  beforeEach(() => {
    control.granted = true;
    control.coords = { latitude: 35.2001, longitude: 129.1002 };
    control.permissionError = false;
    control.positionError = false;
    control.positionHang = false;
    control.lastKnown = null;
    control.positionCalls = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    control.positionHang = false;
    control.lastKnown = null;
    control.positionCalls = 0;
    vi.useRealTimers();
  });

  /** 내 위치 버튼 탭 1회 재현 — 타임아웃 경과까지 진행 후 결과 반환 */
  const tapAndSettle = async () => {
    const pending = resolveMapCenter();
    await vi.advanceTimersByTimeAsync(3100);
    return pending;
  };

  it("무응답 조회 중 연타(2회 호출)해도 네이티브 위치 요청은 1개만 발행된다", async () => {
    control.positionHang = true;
    await expect(tapAndSettle()).resolves.toEqual(SEOMYEON_CENTER);
    await expect(tapAndSettle()).resolves.toEqual(SEOMYEON_CENTER);
    expect(control.positionCalls).toBe(1);
  });

  it("이전 조회가 성공으로 완료된 뒤의 재조회는 새 네이티브 요청을 발행한다 — 공유는 진행 중일 때만", async () => {
    await expect(resolveMapCenter()).resolves.toEqual({
      lat: 35.2001,
      lng: 129.1002,
    });
    await expect(resolveMapCenter()).resolves.toEqual({
      lat: 35.2001,
      lng: 129.1002,
    });
    expect(control.positionCalls).toBe(2);
  });

  it("실패로 완료된 조회는 클리어되어 다음 조회가 새 요청으로 성공할 수 있다", async () => {
    control.positionError = true;
    await expect(resolveMapCenter()).resolves.toEqual(SEOMYEON_CENTER);
    control.positionError = false;
    await expect(resolveMapCenter()).resolves.toEqual({
      lat: 35.2001,
      lng: 129.1002,
    });
    expect(control.positionCalls).toBe(2);
  });
});

/**
 * 템플릿 ① 순수 로직 — MSG-447 기준 2·3·4. `resolveMapCenter()`는 총함수라 **거부를 서면
 * 좌표로 흡수**해 호출부가 "거부"와 "측위 실패"를 구분할 수 없었다. 내 위치 버튼이 조용히
 * 서면으로 튀던 원인이고, 이 형제 함수가 그 구분을 되살린다(결정 D1).
 */
describe("resolveMapCenterWithPermission — 좌표 + 권한 상태 (MSG-447 기준 2·3·4)", () => {
  beforeEach(() => {
    control.granted = true;
    control.canAskAgain = true;
    control.coords = { latitude: 35.2001, longitude: 129.1002 };
    control.permissionError = false;
    control.positionError = false;
    control.lastKnown = null;
  });

  it("허용되면 현재 위치와 granted를 함께 돌려준다 (기준 1)", async () => {
    await expect(resolveMapCenterWithPermission()).resolves.toEqual({
      center: { lat: 35.2001, lng: 129.1002 },
      permission: "granted",
    });
  });

  it("거부했지만 다시 물을 수 있으면 서면 중심 + undetermined다 — 재요청 CTA가 붙는다 (기준 3, R3)", async () => {
    control.granted = false;

    await expect(resolveMapCenterWithPermission()).resolves.toEqual({
      center: SEOMYEON_CENTER,
      permission: "undetermined",
    });
  });

  it("'다시 묻지 않음' 영구 거부면 서면 중심 + denied다 — 설정 이동 CTA가 붙는다 (기준 3)", async () => {
    control.granted = false;
    control.canAskAgain = false;

    await expect(resolveMapCenterWithPermission()).resolves.toEqual({
      center: SEOMYEON_CENTER,
      permission: "denied",
    });
  });

  it("권한은 있는데 측위만 실패하면 granted를 유지한다 — 권한 문제가 아닌 것을 권한 문제로 안내하지 않는다 (기준 4)", async () => {
    control.positionError = true;

    await expect(resolveMapCenterWithPermission()).resolves.toEqual({
      center: SEOMYEON_CENTER,
      permission: "granted",
    });
  });

  it("권한 판독 자체가 실패해도 안내를 띄우지 않는다 — 네이티브 접점 장애를 사용자 거부로 오인하지 않는다 (기준 4)", async () => {
    control.permissionError = true;

    await expect(resolveMapCenterWithPermission()).resolves.toEqual({
      center: SEOMYEON_CENTER,
      permission: "granted",
    });
  });
});

/** 템플릿 ① 순수 로직 — MSG-565 L2: expo LocationObject → 플랫폼 중립 CurrentLocation */
describe("toCurrentLocation — LocationObject 변환 (L2)", () => {
  it("coords의 위경도·정확도를 {lat, lng, accuracy}로 낸다", () => {
    expect(
      toCurrentLocation({
        coords: {
          latitude: 35.16,
          longitude: 129.06,
          accuracy: 12.5,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: 0,
      }),
    ).toEqual({ lat: 35.16, lng: 129.06, accuracy: 12.5 });
  });

  it("coords.accuracy가 null이면 accuracy: null이다", () => {
    expect(
      toCurrentLocation({
        coords: {
          latitude: 35.16,
          longitude: 129.06,
          accuracy: null,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: 0,
      }).accuracy,
    ).toBeNull();
  });
});

/**
 * MSG-565 L3·L4 — 위치 구독 어댑터. 권한은 **판독만**(요청 없음, D5) 하고, 구독 프라미스가
 * 해소되기 전 해제되는 레이스(포커스 즉시 이탈)에서도 네이티브 구독이 새지 않아야 한다.
 */
describe("watchPosition — 위치 구독 어댑터 (L3·L4)", () => {
  /** 마이크로태스크 체인(권한 판독 → 구독 → 등록)을 비운다 */
  const flush = async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  };

  beforeEach(() => {
    control.granted = true;
    control.permissionError = false;
    control.watchCalls = 0;
    control.removeCalls = 0;
    control.watchError = false;
    control.resolveWatch = null;
    control.watchCallback = null;
    control.watchErrorHandler = null;
  });

  it("권한이 granted가 아니면 watchPositionAsync를 호출하지 않고 no-op unsubscribe를 돌려준다 (L3)", async () => {
    control.granted = false;

    const unsubscribe = watchPosition(() => {});
    await flush();
    unsubscribe();

    expect(control.watchCalls).toBe(0);
    expect(control.removeCalls).toBe(0);
  });

  it("granted면 구독하고, 위치 콜백이 CurrentLocation으로 도착한다 (L3)", async () => {
    const onPosition = vi.fn();

    watchPosition(onPosition);
    await flush();
    control.resolveWatch?.();
    await flush();
    control.watchCallback?.({
      coords: { latitude: 35.16, longitude: 129.06, accuracy: 8 },
    });

    expect(control.watchCalls).toBe(1);
    expect(onPosition).toHaveBeenCalledWith({
      lat: 35.16,
      lng: 129.06,
      accuracy: 8,
    });
  });

  it("반환한 unsubscribe가 LocationSubscription.remove()를 부른다 (L3)", async () => {
    const unsubscribe = watchPosition(() => {});
    await flush();
    control.resolveWatch?.();
    await flush();

    unsubscribe();

    expect(control.removeCalls).toBe(1);
  });

  it("구독 프라미스가 해소되기 전에 unsubscribe되면 해소 직후 즉시 remove된다 — 레이스 (L3)", async () => {
    const unsubscribe = watchPosition(() => {});
    await flush();
    unsubscribe();
    expect(control.removeCalls).toBe(0);

    control.resolveWatch?.();
    await flush();

    expect(control.removeCalls).toBe(1);
  });

  it("권한 판독 자체가 던져도 예외가 전파되지 않고 구독 없음으로 끝난다 (L4)", async () => {
    control.permissionError = true;

    const unsubscribe = watchPosition(() => {});
    await flush();

    expect(control.watchCalls).toBe(0);
    expect(() => unsubscribe()).not.toThrow();
  });

  it("watchPositionAsync가 reject해도 예외가 전파되지 않는다 (L4)", async () => {
    control.watchError = true;
    const rejections: unknown[] = [];
    const onRejection = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", onRejection);

    const unsubscribe = watchPosition(() => {});
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 0));
    process.off("unhandledRejection", onRejection);

    expect(rejections).toEqual([]);
    expect(() => unsubscribe()).not.toThrow();
  });

  it("errorHandler가 호출되면 구독을 종료하고 예외를 내지 않는다 (L4)", async () => {
    watchPosition(() => {});
    await flush();
    control.resolveWatch?.();
    await flush();

    expect(() =>
      control.watchErrorHandler?.(new Error("provider unavailable")),
    ).not.toThrow();
    expect(control.removeCalls).toBe(1);
  });
});
