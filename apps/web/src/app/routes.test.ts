import { describe, expect, it } from "vitest";
import { ROUTES, getActiveNavKey, isNavKey } from "./routes";

describe("isNavKey", () => {
  it("ROUTES에 정의된 네비 섹션 키는 true를 반환한다", () => {
    for (const key of Object.keys(ROUTES)) {
      expect(isNavKey(key)).toBe(true);
    }
  });

  it("정의되지 않은 키는 false를 반환한다", () => {
    expect(isNavKey("unknown")).toBe(false);
    expect(isNavKey("")).toBe(false);
  });
});

describe("login 라우트 부재 (MSG-46 후속 2 G7) — 로그인은 모달이 유일한 진입", () => {
  it("라우트 상수에 login이 없다 — /login 라우트를 다시 만들지 않는다", () => {
    expect("login" in ROUTES).toBe(false);
  });

  it('getActiveNavKey("/login")은 undefined다 — 미등록 경로라 라우터 기본 폴백을 따른다', () => {
    expect(getActiveNavKey("/login")).toBeUndefined();
  });
});

describe("getActiveNavKey", () => {
  it("루트 경로는 home을 반환한다", () => {
    expect(getActiveNavKey("/")).toBe("home");
  });

  it("각 섹션 경로는 해당 네비 키를 반환한다", () => {
    expect(getActiveNavKey(ROUTES.aiRoute)).toBe("aiRoute");
    expect(getActiveNavKey(ROUTES.upload)).toBe("upload");
    expect(getActiveNavKey(ROUTES.dex)).toBe("dex");
    expect(getActiveNavKey(ROUTES.profile)).toBe("profile");
  });

  it("섹션 하위 경로도 해당 네비 키를 반환한다", () => {
    expect(getActiveNavKey("/profile/settings")).toBe("profile");
  });

  it("알 수 없는 경로는 undefined를 반환한다", () => {
    expect(getActiveNavKey("/unknown")).toBeUndefined();
  });

  // MSG-328: 탐색 라우트 제거 — 홈 좌측 패널로 통합. /explore는 미등록 경로다 (AC 1~3)
  it("제거된 /explore 경로는 undefined다 — 라우터 404 폴백을 따른다 (MSG-328 AC 2)", () => {
    expect("explore" in ROUTES).toBe(false);
    expect(getActiveNavKey("/explore")).toBeUndefined();
  });
});

/**
 * AI 경로추천 라우트 신설 (MSG-488 L11, 승인 Q1) — 티켓 가칭 `/route`가 아니라 `/ai-route`다.
 * 기존 `route` 3중 동음이의(ROUTES · ThemeId "route" 코스 칩 · map-overlay-store.routes)를 피한다.
 */
describe("AI 경로추천 라우트 (MSG-488 L11)", () => {
  it("네비 섹션은 홈·AI 경로추천·업로드·도감·프로필 5개다 (L11)", () => {
    expect(Object.keys(ROUTES)).toEqual([
      "home",
      "aiRoute",
      "upload",
      "dex",
      "profile",
    ]);
  });

  it('경로는 "/ai-route"이고 getActiveNavKey가 aiRoute를 반환한다 (L11)', () => {
    expect(ROUTES.aiRoute).toBe("/ai-route");
    expect(getActiveNavKey("/ai-route")).toBe("aiRoute");
  });

  it('티켓 가칭 "/route"는 미등록 경로다 — 라우터 404 폴백을 따른다 (L11, Q1)', () => {
    expect("route" in ROUTES).toBe(false);
    expect(getActiveNavKey("/route")).toBeUndefined();
  });
});
