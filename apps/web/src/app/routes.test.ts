import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_SETTINGS_PATH,
  ROUTES,
  getActiveNavKey,
  isNavKey,
} from "./routes";

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

describe("알림 설정 상세 경로 (MSG-409 AC 1) — /profile 하위, 네비 섹션 아님", () => {
  it("경로 상수는 /profile/notifications다 — ROUTES 밖 (KAKAO_CALLBACK_PATH 전례)", () => {
    expect(NOTIFICATION_SETTINGS_PATH).toBe("/profile/notifications");
    expect(isNavKey("notifications")).toBe(false);
  });

  it("알림 설정 경로에서 사이드레일 활성 탭은 프로필이다 — prefix 매칭 보존 단정 (AC 1)", () => {
    expect(getActiveNavKey(NOTIFICATION_SETTINGS_PATH)).toBe("profile");
  });
});
