import { describe, expect, it, vi } from "vitest";
import type { PushPermissionStatus } from "../model/push-registration";
import {
  disablePush,
  enablePush,
  resolveToggleDisplay,
  syncPushToken,
  type PushDeps,
} from "./push-registration-flow";

const deps = (
  overrides?: Partial<PushDeps>,
): PushDeps & {
  stored: { value: string | null };
} => {
  const stored = { value: null as string | null };
  const base: PushDeps = {
    readPermission: async () => "granted",
    requestPermission: async () => "granted",
    readDeviceToken: async () => "fcm-token",
    readStoredToken: async () => stored.value,
    saveStoredToken: async (token) => {
      stored.value = token;
    },
    clearStoredToken: async () => {
      stored.value = null;
    },
    registerToken: vi.fn(async () => {}),
    unregisterToken: vi.fn(async () => {}),
    ...overrides,
  };
  return { ...base, stored };
};

/** 권한을 다시 묻지 않는지 관찰하는 공유 스파이 — 두 시나리오가 같은 형태를 쓴다 */
const grantingSpy = () =>
  vi.fn(async (): Promise<PushPermissionStatus> => "granted");

describe("enablePush — 토글 ON (기준 14·15)", () => {
  it("권한을 요청해 허용되면 기기 토큰을 등록하고 보관한다", async () => {
    const d = deps({ readPermission: async () => "undetermined" });
    const result = await enablePush(d);

    expect(result).toEqual({ status: "enabled" });
    expect(d.registerToken).toHaveBeenCalledWith("fcm-token");
    expect(d.stored.value).toBe("fcm-token");
  });

  it("이미 허용된 상태면 권한을 다시 묻지 않는다", async () => {
    const requestPermission = grantingSpy();
    const d = deps({
      readPermission: async () => "granted",
      requestPermission,
    });

    await enablePush(d);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("권한이 거부되면 등록하지 않고 거부를 알린다 — 토글은 OFF로 남는다", async () => {
    const d = deps({
      readPermission: async () => "undetermined",
      requestPermission: async () => "denied",
    });

    expect(await enablePush(d)).toEqual({ status: "denied" });
    expect(d.registerToken).not.toHaveBeenCalled();
    expect(d.stored.value).toBeNull();
  });

  it("이미 영구 거부된 상태면 권한 요청 자체를 건너뛴다", async () => {
    const requestPermission = grantingSpy();
    const d = deps({ readPermission: async () => "denied", requestPermission });

    expect(await enablePush(d)).toEqual({ status: "denied" });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("기기 토큰 취득 실패(Play 서비스 부재 등)는 실패로 접고 보관하지 않는다", async () => {
    const d = deps({
      readDeviceToken: async () => {
        throw new Error("no play services");
      },
    });

    expect(await enablePush(d)).toEqual({ status: "failed" });
    expect(d.stored.value).toBeNull();
  });

  it("서버 등록이 실패하면 보관하지 않는다 — 해제할 수 없는 유령 ON을 만들지 않는다", async () => {
    const d = deps({
      registerToken: vi.fn(async () => {
        throw new Error("500");
      }),
    });

    expect(await enablePush(d)).toEqual({ status: "failed" });
    expect(d.stored.value).toBeNull();
  });
});

describe("disablePush — 토글 OFF (기준 14)", () => {
  it("보관 토큰으로 해제하고 보관을 비운다", async () => {
    const d = deps();
    await d.saveStoredToken("fcm-token");

    expect(await disablePush(d)).toEqual({ status: "disabled" });
    expect(d.unregisterToken).toHaveBeenCalledWith("fcm-token");
    expect(d.stored.value).toBeNull();
  });

  it("보관 토큰이 없으면 서버를 부르지 않는다", async () => {
    const d = deps();
    expect(await disablePush(d)).toEqual({ status: "disabled" });
    expect(d.unregisterToken).not.toHaveBeenCalled();
  });

  it("해제 실패 시 보관을 유지한다 — 비우면 재해제 경로가 영구 소멸한다", async () => {
    const d = deps({
      unregisterToken: vi.fn(async () => {
        throw new Error("network");
      }),
    });
    await d.saveStoredToken("fcm-token");

    expect(await disablePush(d)).toEqual({ status: "failed" });
    expect(d.stored.value).toBe("fcm-token");
  });
});

describe("syncPushToken — 상주 자동 동기화 (기준 14)", () => {
  it("보관 토큰이 없으면 아무것도 하지 않는다 — 자동 등록 경로는 없다", async () => {
    const d = deps();
    await syncPushToken(d, true);

    expect(d.registerToken).not.toHaveBeenCalled();
    expect(d.unregisterToken).not.toHaveBeenCalled();
  });

  it("비로그인이면 동기화하지 않는다", async () => {
    const d = deps();
    await d.saveStoredToken("fcm-token");
    await syncPushToken(d, false);

    expect(d.registerToken).not.toHaveBeenCalled();
  });

  it("같은 토큰이면 재등록만 한다 (UPSERT — last_used_at 갱신)", async () => {
    const d = deps();
    await d.saveStoredToken("fcm-token");
    await syncPushToken(d, true);

    expect(d.registerToken).toHaveBeenCalledWith("fcm-token");
    expect(d.unregisterToken).not.toHaveBeenCalled();
  });

  it("토큰이 로테이션됐으면 구토큰을 해제하고 신규를 등록·보관한다", async () => {
    const d = deps({ readDeviceToken: async () => "rotated" });
    await d.saveStoredToken("stale");
    await syncPushToken(d, true);

    expect(d.unregisterToken).toHaveBeenCalledWith("stale");
    expect(d.registerToken).toHaveBeenCalledWith("rotated");
    expect(d.stored.value).toBe("rotated");
  });

  it("동기화 실패는 삼킨다 — 앱 기동을 막지 않는다 (보관도 유지)", async () => {
    const d = deps({
      registerToken: vi.fn(async () => {
        throw new Error("500");
      }),
    });
    await d.saveStoredToken("fcm-token");

    await expect(syncPushToken(d, true)).resolves.toBeUndefined();
    expect(d.stored.value).toBe("fcm-token");
  });
});

/**
 * PR #78 리뷰 반영 ①(react-doctor no-loading-flag-reset-outside-finally의 근인).
 * `enablePush`/`disablePush`가 **거부(reject)하면** 호출 훅의 `setBusy(false)`가 실행되지
 * 않아 토글이 영구히 잠긴다. 권한 판독·요청은 네이티브 모듈 접점이라(동적 로드) 모듈이 빠진
 * 빌드에서 실제로 던진다 — D2와 같은 실패면이다. 여기서 **총함수 계약**으로 못박는다.
 */
describe("토글 조작은 거부하지 않는다 — 총함수 계약 (리뷰 반영 ①)", () => {
  it("권한 판독이 던져도 실패로 접는다", async () => {
    const d = deps({
      readPermission: async () => {
        throw new Error("Cannot find native module");
      },
    });
    await expect(enablePush(d)).resolves.toEqual({ status: "failed" });
  });

  it("권한 요청이 던져도 실패로 접는다", async () => {
    const d = deps({
      readPermission: async () => "undetermined",
      requestPermission: async () => {
        throw new Error("Cannot find native module");
      },
    });
    await expect(enablePush(d)).resolves.toEqual({ status: "failed" });
    expect(d.registerToken).not.toHaveBeenCalled();
  });

  it("보관 토큰 읽기가 던져도 실패로 접는다 — 해제 대상을 모르므로 서버 호출은 없다", async () => {
    const d = deps({
      readStoredToken: async () => {
        throw new Error("storage down");
      },
    });
    await expect(disablePush(d)).resolves.toEqual({ status: "failed" });
    expect(d.unregisterToken).not.toHaveBeenCalled();
  });
});

/**
 * PR #78 리뷰 반영 ② — 토글 OFF 실패 시 표시가 실제와 반대였다.
 * `disablePush` 실패는 **보관 토큰을 의도적으로 유지**한다(재해제 경로 보존). 즉 서버 등록이
 * 살아 있어 푸시는 계속 온다 — 그때 토글을 OFF로 보이면 "껐는데 알림이 온다"가 된다.
 */
describe("resolveToggleDisplay — 조작 결과 → 표시 상태 (리뷰 반영 ②)", () => {
  it("ON 성공은 켜짐이다", () => {
    expect(resolveToggleDisplay(true, "enabled")).toBe(true);
  });

  it("ON 실패·거부는 꺼짐이다 — 등록되지 않았으므로 실제와 일치한다", () => {
    expect(resolveToggleDisplay(true, "denied")).toBe(false);
    expect(resolveToggleDisplay(true, "failed")).toBe(false);
  });

  it("OFF 성공은 꺼짐이다", () => {
    expect(resolveToggleDisplay(false, "disabled")).toBe(false);
  });

  it("**OFF 실패는 켜짐이다** — 보관 토큰이 남아 서버 등록이 살아 있다", () => {
    expect(resolveToggleDisplay(false, "failed")).toBe(true);
  });
});
