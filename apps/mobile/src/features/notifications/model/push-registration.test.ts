import { describe, expect, it } from "vitest";
import {
  PUSH_PERMISSION_DENIED_MESSAGE,
  decideSyncAction,
  derivePushEnabled,
  reconcilePushError,
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

/**
 * 템플릿 ① 순수 로직 — MSG-447 기준 13 **실기 회귀**.
 *
 * 실기에서 관찰한 결함: 알림 권한을 거부해 설정 안내가 뜬 뒤, 시스템 설정에서 권한을 켜고
 * 앱으로 돌아와도 **안내가 그대로 남았다**. 포그라운드 재판독이 `permission`은 갱신하지만
 * 조작 오류(`error="denied"`)를 그대로 둬, 안내 파생이 그 낡은 값을 계속 봤기 때문이다.
 *
 * 안내 파생 쪽에서 `pushError`를 무시하도록 고치면 안 된다 — 토글을 막 거부한 직후에는
 * 재판독이 아직 도착하지 않아 그 값이 **유일한** 근거다. 정리는 새 사실이 도착하는 지점,
 * 즉 재판독에서 한다.
 */
describe("reconcilePushError — 기기 재판독이 도착했을 때 낡은 거부를 정리한다 (MSG-447 기준 13)", () => {
  it("설정에서 권한을 켜고 돌아오면 거부 오류가 사라진다", () => {
    expect(reconcilePushError("denied", "granted")).toBeNull();
  });

  it("여전히 거부돼 있으면 그대로 남는다 — 안내가 조용히 사라지면 사용자가 갈 곳을 잃는다", () => {
    expect(reconcilePushError("denied", "denied")).toBe("denied");
    expect(reconcilePushError("denied", "undetermined")).toBe("denied");
  });

  it("등록 실패는 권한과 무관하므로 건드리지 않는다 — 재시도로 풀리는 다른 축이다", () => {
    expect(reconcilePushError("failed", "granted")).toBe("failed");
  });

  it("오류가 없으면 계속 없다", () => {
    expect(reconcilePushError(null, "granted")).toBeNull();
  });
});
