import { beforeEach, describe, expect, it } from "vitest";
import { viewerSessionStorage } from "./storage";

describe("viewerSessionStorage — 비로그인 열람 세션 id (MSG-517 AC 5, 확정 3)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("최초 호출에서 UUID를 발급하고 이후 호출은 같은 값을 돌려준다 (AC 5)", () => {
    const first = viewerSessionStorage.get();

    const second = viewerSessionStorage.get();

    expect(second).toBe(first);
  });

  it("발급 id는 공백 아님·64자 이하다 — 서버 X-Viewer-Session 제약 (AC 5)", () => {
    const id = viewerSessionStorage.get();

    expect(id.trim().length).toBeGreaterThan(0);
    expect(id.length).toBeLessThanOrEqual(64);
  });

  it("탭 세션 소멸(sessionStorage 소거) 후에는 새 id가 발급된다 (확정 3 — 탭 단위 고유)", () => {
    const first = viewerSessionStorage.get();
    sessionStorage.clear();

    const second = viewerSessionStorage.get();

    expect(second).not.toBe(first);
  });
});
