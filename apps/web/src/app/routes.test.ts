import { describe, expect, it } from "vitest";
import { ROUTES, getActiveNavKey, isNavKey } from "./routes";

describe("isNavKey", () => {
  it("ROUTES에 정의된 키는 true를 반환한다", () => {
    for (const key of Object.keys(ROUTES)) {
      expect(isNavKey(key)).toBe(true);
    }
  });

  it("정의되지 않은 키는 false를 반환한다", () => {
    expect(isNavKey("unknown")).toBe(false);
    expect(isNavKey("")).toBe(false);
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
