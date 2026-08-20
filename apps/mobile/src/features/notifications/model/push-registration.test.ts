import { describe, expect, it } from "vitest";
import {
  PUSH_PERMISSION_DENIED_MESSAGE,
  decideSyncAction,
  derivePushEnabled,
  shouldAutoSync,
  type PushSyncAction,
} from "./push-registration";

describe("derivePushEnabled — 토글 표시 정본 (기준 14·15)", () => {
  it("권한 granted이고 보관 토큰이 있을 때만 ON이다", () => {
    expect(
      derivePushEnabled({ permission: "granted", hasStoredToken: true }),
    ).toBe(true);
  });

  it("권한만 있고 토큰이 없으면 OFF다 — 등록되지 않은 상태를 켜진 것처럼 보이지 않게", () => {
    expect(
      derivePushEnabled({ permission: "granted", hasStoredToken: false }),
    ).toBe(false);
  });

  it("권한이 없으면 토큰이 남아 있어도 OFF다", () => {
    expect(
      derivePushEnabled({ permission: "denied", hasStoredToken: true }),
    ).toBe(false);
    expect(
      derivePushEnabled({ permission: "undetermined", hasStoredToken: true }),
    ).toBe(false);
  });
});

describe("decideSyncAction — 보관 토큰 vs 신규 토큰 (기준 14)", () => {
  it("보관 토큰이 없으면 아무것도 하지 않는다 — 자동 등록 경로는 없다", () => {
    expect(decideSyncAction(null, "fresh")).toEqual<PushSyncAction>({
      type: "none",
    });
  });

  it("같은 토큰이면 재등록(UPSERT)이다", () => {
    expect(decideSyncAction("same", "same")).toEqual<PushSyncAction>({
      type: "reregister",
      token: "same",
    });
  });

  it("토큰이 바뀌었으면 구토큰 해제 + 신규 등록이다", () => {
    expect(decideSyncAction("old", "new")).toEqual<PushSyncAction>({
      type: "rotate",
      staleToken: "old",
      token: "new",
    });
  });
});

describe("shouldAutoSync — 상주 자동 동기화 발동 조건 (기준 14)", () => {
  it("로그인 + 권한 granted + 보관 토큰 존재의 AND다", () => {
    expect(
      shouldAutoSync({
        isAuthenticated: true,
        permission: "granted",
        storedToken: "t",
      }),
    ).toBe(true);
  });

  it("셋 중 하나라도 빠지면 발동하지 않는다", () => {
    expect(
      shouldAutoSync({
        isAuthenticated: false,
        permission: "granted",
        storedToken: "t",
      }),
    ).toBe(false);
    expect(
      shouldAutoSync({
        isAuthenticated: true,
        permission: "undetermined",
        storedToken: "t",
      }),
    ).toBe(false);
    expect(
      shouldAutoSync({
        isAuthenticated: true,
        permission: "granted",
        storedToken: null,
      }),
    ).toBe(false);
  });
});

describe("권한 거부 안내 (기준 15)", () => {
  it("기기 설정에서 켜라는 안내 문구를 갖는다", () => {
    expect(PUSH_PERMISSION_DENIED_MESSAGE).toContain("설정");
  });
});
