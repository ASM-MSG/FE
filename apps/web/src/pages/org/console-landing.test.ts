import { describe, expect, it } from "vitest";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { consoleLandingPath } from "./console-landing";

describe("consoleLandingPath — 로그인 성공 후 role별 착지 분기 (AC 2)", () => {
  it("ORG는 운영자 홈에 착지한다 (AC 2)", () => {
    expect(consoleLandingPath("ORG")).toBe(CONSOLE_ROUTES.orgHome);
  });

  it("ADMIN은 심사 큐에 착지한다 (AC 2)", () => {
    expect(consoleLandingPath("ADMIN")).toBe(CONSOLE_ROUTES.adminReview);
  });

  it("일반 회원(USER)은 착지 경로가 없다 — 폼 안내로 수렴 (AC 2)", () => {
    expect(consoleLandingPath("USER")).toBeNull();
  });

  it("role이 확정되지 않은 세션도 착지 경로가 없다 — 경계 (AC 2)", () => {
    expect(consoleLandingPath(null)).toBeNull();
  });
});
