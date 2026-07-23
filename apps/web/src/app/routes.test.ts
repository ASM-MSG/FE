import { describe, expect, it } from "vitest";
import { NAV_ROUTES, ROUTES, getActiveNavKey, isNavKey } from "./routes";

describe("isNavKey", () => {
  it("NAV_ROUTES에 정의된 네비 섹션 키는 true를 반환한다", () => {
    for (const key of Object.keys(NAV_ROUTES)) {
      expect(isNavKey(key)).toBe(true);
    }
  });

  it("정의되지 않은 키는 false를 반환한다", () => {
    expect(isNavKey("unknown")).toBe(false);
    expect(isNavKey("")).toBe(false);
  });
});

describe("login 라우트 (MSG-46) — 셸 밖 독립 페이지, 네비 섹션 아님", () => {
  it("라우트 상수에 /login이 추가된다 (AC 9)", () => {
    expect(ROUTES.login).toBe("/login");
  });

  it('isNavKey("login")은 false다 — login은 네비 섹션으로 취급하지 않는다 (AC 9)', () => {
    expect(isNavKey("login")).toBe(false);
  });

  it('getActiveNavKey("/login")은 undefined다 (AC 9)', () => {
    expect(getActiveNavKey("/login")).toBeUndefined();
  });
});

describe("getActiveNavKey", () => {
  it("루트 경로는 home을 반환한다", () => {
    expect(getActiveNavKey("/")).toBe("home");
  });

  it("각 섹션 경로는 해당 네비 키를 반환한다", () => {
    expect(getActiveNavKey(ROUTES.explore)).toBe("explore");
    expect(getActiveNavKey(ROUTES.upload)).toBe("upload");
    expect(getActiveNavKey(ROUTES.dex)).toBe("dex");
    expect(getActiveNavKey(ROUTES.profile)).toBe("profile");
  });

  it("섹션 하위 경로도 해당 네비 키를 반환한다", () => {
    expect(getActiveNavKey("/explore/123")).toBe("explore");
    expect(getActiveNavKey("/profile/settings")).toBe("profile");
  });

  it("알 수 없는 경로는 undefined를 반환한다", () => {
    expect(getActiveNavKey("/unknown")).toBeUndefined();
  });
});
