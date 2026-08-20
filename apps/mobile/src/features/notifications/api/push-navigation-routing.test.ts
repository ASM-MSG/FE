import { describe, expect, it, vi } from "vitest";
import {
  startNotificationRouting,
  type PushNavigationDeps,
} from "./push-navigation-routing";

const deps = (overrides?: Partial<PushNavigationDeps>): PushNavigationDeps => ({
  ensureForegroundHandler: async () => {},
  readLastNotificationData: async () => null,
  subscribeToTaps: async () => () => {},
  ...overrides,
});

describe("startNotificationRouting — 알림 탭 라우팅 (기준 16)", () => {
  it("실행 중 탭한 알림의 videoId로 확인 화면에 보낸다", async () => {
    const navigate = vi.fn();
    const tap: { emit?: (data: unknown) => void } = {};
    startNotificationRouting(
      deps({
        subscribeToTaps: async (onTap) => {
          tap.emit = onTap;
          return () => {};
        },
      }),
      navigate,
    );

    await vi.waitFor(() => expect(tap.emit).toBeDefined());
    tap.emit?.({ videoId: 42 });
    expect(navigate).toHaveBeenCalledWith("/upload/blur?videoId=42");
  });

  it("콜드 스타트(앱 종료 상태에서 알림으로 실행)도 같은 화면으로 보낸다", async () => {
    const navigate = vi.fn();
    startNotificationRouting(
      deps({ readLastNotificationData: async () => ({ videoId: 7 }) }),
      navigate,
    );

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/upload/blur?videoId=7"),
    );
  });

  it("규격 밖 payload는 무동작이다", async () => {
    const navigate = vi.fn();
    const tap: { emit?: (data: unknown) => void } = {};
    startNotificationRouting(
      deps({
        subscribeToTaps: async (onTap) => {
          tap.emit = onTap;
          return () => {};
        },
      }),
      navigate,
    );

    await vi.waitFor(() => expect(tap.emit).toBeDefined());
    tap.emit?.({ foo: "bar" });
    expect(navigate).not.toHaveBeenCalled();
  });

  it("정리 함수가 구독을 해지한다", async () => {
    const unsubscribe = vi.fn();
    const cleanup = startNotificationRouting(
      deps({ subscribeToTaps: async () => unsubscribe }),
      vi.fn(),
    );

    await vi.waitFor(() => expect(unsubscribe).not.toHaveBeenCalled());
    cleanup();
    await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
  });

  it("구독이 늦게 도착해도(비동기 로드) 이미 정리됐으면 즉시 해지한다 — 누수 방지", async () => {
    const unsubscribe = vi.fn();
    const cleanup = startNotificationRouting(
      deps({ subscribeToTaps: async () => unsubscribe }),
      vi.fn(),
    );

    cleanup();
    await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
  });

  it("해지 후 도착한 탭은 무시한다 — 언마운트 뒤 라우팅 방지", async () => {
    const navigate = vi.fn();
    const tap: { emit?: (data: unknown) => void } = {};
    const cleanup = startNotificationRouting(
      deps({
        subscribeToTaps: async (onTap) => {
          tap.emit = onTap;
          return () => {};
        },
      }),
      navigate,
    );

    await vi.waitFor(() => expect(tap.emit).toBeDefined());
    cleanup();
    tap.emit?.({ videoId: 42 });
    expect(navigate).not.toHaveBeenCalled();
  });
});

/**
 * 실기 검증이 잡은 결함(2026-08-19): `expo-notifications` 네이티브 모듈이 빠진 빌드에서
 * 어댑터의 모듈 스코프 호출이 던지자 `_layout.tsx`가 통째로 평가 실패했고
 * ("Route ./_layout.tsx is missing the required default export"), **앱 전체가 검은 화면**이 됐다.
 * 푸시를 못 쓰는 것은 기준 15가 허용하는 상태지만 앱이 죽는 것은 아니다 — 인앱 통지는
 * 그 상태에서도 동작해야 한다.
 */
describe("네이티브 모듈 부재 내성 (실기 환류)", () => {
  it("핸들러 등록이 거부돼도 라우팅 시작이 앱을 죽이지 않는다", async () => {
    const cleanup = startNotificationRouting(
      deps({
        ensureForegroundHandler: async () => {
          throw new Error("Cannot find native module 'ExpoPushTokenManager'");
        },
      }),
      vi.fn(),
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(() => cleanup()).not.toThrow();
  });

  it("구독이 거부돼도 앱을 죽이지 않고, 정리 함수는 여전히 안전하다", async () => {
    const cleanup = startNotificationRouting(
      deps({
        subscribeToTaps: async () => {
          throw new Error("Cannot find native module");
        },
      }),
      vi.fn(),
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(() => cleanup()).not.toThrow();
  });

  it("콜드 스타트 조회가 거부돼도 미처리 거부로 새지 않는다", async () => {
    const navigate = vi.fn();
    const cleanup = startNotificationRouting(
      deps({
        readLastNotificationData: async () => {
          throw new Error("Cannot find native module");
        },
      }),
      navigate,
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(navigate).not.toHaveBeenCalled();
    cleanup();
  });
});
