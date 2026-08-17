import { describe, expect, it } from "vitest";
import {
  buildMessagingSwUrl,
  decideSyncAction,
  shouldAutoSync,
} from "./push-sync";

describe("shouldAutoSync — 자동 동기화 발동 조건 (AC 1·2·3·8)", () => {
  const base = {
    isAuthenticated: true,
    supported: true,
    permission: "granted" as const,
    storedToken: "tok-a",
  };

  it("로그인 && 지원 && granted && 보관 토큰 존재면 동기화한다 (AC 1)", () => {
    expect(shouldAutoSync(base)).toBe(true);
  });

  it("보관 토큰이 없으면 동기화하지 않는다 — 신규 자동 등록 경로 없음 (AC 2)", () => {
    expect(shouldAutoSync({ ...base, storedToken: null })).toBe(false);
  });

  it("비로그인이면 동기화하지 않는다 (AC 3)", () => {
    expect(shouldAutoSync({ ...base, isAuthenticated: false })).toBe(false);
  });

  it("권한이 granted가 아니면 동기화하지 않는다 (AC 1)", () => {
    expect(shouldAutoSync({ ...base, permission: "default" })).toBe(false);
    expect(shouldAutoSync({ ...base, permission: "denied" })).toBe(false);
    expect(shouldAutoSync({ ...base, permission: null })).toBe(false);
  });

  it("미지원 브라우저면 동기화하지 않는다 (AC 8)", () => {
    expect(shouldAutoSync({ ...base, supported: false })).toBe(false);
  });
});

describe("decideSyncAction — 보관 토큰 vs 신규 토큰 전이 (AC 1)", () => {
  it("보관 토큰과 같으면 재등록이다 — last_used_at 갱신 (AC 1)", () => {
    expect(decideSyncAction("tok-a", "tok-a")).toEqual({
      type: "reregister",
      token: "tok-a",
    });
  });

  it("보관 토큰과 다르면 로테이션이다 — 구토큰 해제 후 신규 등록 (AC 1)", () => {
    expect(decideSyncAction("tok-old", "tok-new")).toEqual({
      type: "rotate",
      staleToken: "tok-old",
      token: "tok-new",
    });
  });

  it("보관 토큰이 없으면 아무것도 하지 않는다 (AC 2)", () => {
    expect(decideSyncAction(null, "tok-new")).toEqual({ type: "none" });
  });
});

describe("buildMessagingSwUrl — SW 등록 URL 쿼리스트링 조립 (AC 12)", () => {
  it("config 4필드를 쿼리스트링으로 실어 SW 경로를 만든다", () => {
    const url = buildMessagingSwUrl({
      apiKey: "key-1",
      projectId: "proj-1",
      messagingSenderId: "sender-1",
      appId: "1:2:web:3",
    });

    const [path, query] = url.split("?");
    expect(path).toBe("/firebase-messaging-sw.js");
    const params = new URLSearchParams(query);
    expect(params.get("apiKey")).toBe("key-1");
    expect(params.get("projectId")).toBe("proj-1");
    expect(params.get("messagingSenderId")).toBe("sender-1");
    expect(params.get("appId")).toBe("1:2:web:3");
  });
});
