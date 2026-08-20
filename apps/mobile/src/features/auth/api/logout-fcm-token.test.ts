import { describe, expect, it, vi } from "vitest";
import {
  buildLogoutBody,
  settleLogoutToken,
  type LogoutTokenDeps,
} from "./logout-fcm-token";

const deps = (
  stored: string | null,
  overrides?: Partial<LogoutTokenDeps>,
): LogoutTokenDeps & { cleared: { value: boolean } } => {
  const cleared = { value: false };
  return {
    readStoredToken: async () => stored,
    clearStoredToken: async () => {
      cleared.value = true;
    },
    ...overrides,
    cleared,
  };
};

describe("buildLogoutBody — 로그아웃 body (기준 17)", () => {
  it("보관 토큰이 있으면 fcmToken을 동봉한다", () => {
    expect(buildLogoutBody("fcm-token")).toEqual({
      body: { fcmToken: "fcm-token" },
    });
  });

  it("보관 토큰이 없으면 body 없이 호출한다 — 기존 동작 유지", () => {
    expect(buildLogoutBody(null)).toEqual({});
  });
});

describe("settleLogoutToken — 로그아웃 정산 (기준 17)", () => {
  it("보관 토큰을 읽어 body를 만들고 보관을 비운다", async () => {
    const d = deps("fcm-token");
    expect(await settleLogoutToken(d)).toEqual({
      body: { fcmToken: "fcm-token" },
    });
    expect(d.cleared.value).toBe(true);
  });

  it("보관 토큰이 없어도 비우기를 시도한다 — 무해하고 경로가 하나로 유지된다", async () => {
    const d = deps(null);
    expect(await settleLogoutToken(d)).toEqual({});
    expect(d.cleared.value).toBe(true);
  });

  it("보관 읽기가 실패해도 로그아웃을 막지 않는다", async () => {
    const readStoredToken = vi.fn(async () => {
      throw new Error("storage down");
    });
    const d = deps(null, { readStoredToken });
    await expect(settleLogoutToken(d)).resolves.toEqual({});
  });
});
