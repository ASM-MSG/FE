import { describe, expect, it, vi } from "vitest";
import type { PushPermissionStatus } from "../model/push-registration";
import {
  disablePush,
  enablePush,
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

describe("enablePush — 토글 ON (기준 14·15)", () => {
  it("권한을 요청해 허용되면 기기 토큰을 등록하고 보관한다", async () => {
    const d = deps({ readPermission: async () => "undetermined" });
    const result = await enablePush(d);

    expect(result).toEqual({ status: "enabled" });
    expect(d.registerToken).toHaveBeenCalledWith("fcm-token");
    expect(d.stored.value).toBe("fcm-token");
  });

  it("이미 허용된 상태면 권한을 다시 묻지 않는다", async () => {
    const requestPermission = vi.fn(
      async (): Promise<PushPermissionStatus> => "granted",
    );
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
    const requestPermission = vi.fn(
      async (): Promise<PushPermissionStatus> => "granted",
    );
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
