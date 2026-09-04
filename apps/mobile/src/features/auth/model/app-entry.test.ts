import { readdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isRouteGuardOpen,
  PROTECTED_ROUTES,
  PUBLIC_ROUTES,
  resolveEntry,
} from "./app-entry";

/**
 * MSG-561 홈 로그인 게이트 — 진입 판정(L1)·라우트 가드(L2)·등재 드리프트(L3).
 * L3는 `src/app/**` 파일 목록을 실제로 읽어 상수와 대조한다 — 새 라우트 파일이
 * 등재 없이 생기면(= 조용히 공개) 여기서 RED (D9·R7).
 */

describe("resolveEntry — 앱 진입 판정 (L1)", () => {
  it("온보딩 미완료면 인증·이어가기와 무관하게 온보딩이다", () => {
    expect(
      resolveEntry({
        onboardingCompleted: false,
        isAuthenticated: true,
        resume: "/upload/preview",
      }),
    ).toBe("onboarding");
    expect(
      resolveEntry({
        onboardingCompleted: false,
        isAuthenticated: false,
        resume: null,
      }),
    ).toBe("onboarding");
  });

  it("온보딩 완료 + 비인증이면 이어갈 업로드가 있어도 로그인이다", () => {
    expect(
      resolveEntry({
        onboardingCompleted: true,
        isAuthenticated: false,
        resume: null,
      }),
    ).toBe("login");
    expect(
      resolveEntry({
        onboardingCompleted: true,
        isAuthenticated: false,
        resume: "/upload/preview",
      }),
    ).toBe("login");
  });

  it("온보딩 완료 + 인증 + 이어가기 없음이면 홈이다", () => {
    expect(
      resolveEntry({
        onboardingCompleted: true,
        isAuthenticated: true,
        resume: null,
      }),
    ).toBe("home");
  });

  it("온보딩 완료 + 인증 + 이어가기 있음이면 이어가기다", () => {
    expect(
      resolveEntry({
        onboardingCompleted: true,
        isAuthenticated: true,
        resume: "/upload/preview",
      }),
    ).toBe("resume");
  });
});

describe("isRouteGuardOpen — 보호 라우트 가드 (L2)", () => {
  it("재수화 전에는 인증 여부와 무관하게 열려 있다 — 콜드 스타트 딥링크·푸시 탭 보존 (D2)", () => {
    expect(isRouteGuardOpen({ hydrated: false, isAuthenticated: false })).toBe(
      true,
    );
    expect(isRouteGuardOpen({ hydrated: false, isAuthenticated: true })).toBe(
      true,
    );
  });

  it("재수화 후 인증이면 열리고 비인증이면 닫힌다", () => {
    expect(isRouteGuardOpen({ hydrated: true, isAuthenticated: true })).toBe(
      true,
    );
    expect(isRouteGuardOpen({ hydrated: true, isAuthenticated: false })).toBe(
      false,
    );
  });
});

describe("라우트 등재 드리프트 (L3)", () => {
  const appDir = fileURLToPath(new URL("../../../app/", import.meta.url));
  /** `src/app/**\/*.tsx` → expo-router 라우트 이름 (`_layout` 제외, `/index` 절단, 대괄호 유지) */
  const fileRoutes = readdirSync(appDir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => file.replace(/\.tsx$/, "").replace(/\/index$/, ""))
    .filter((route) => route !== "_layout");

  it("공개 라우트는 정확히 index·login·dev/api-smoke 셋이다 (D1·D11)", () => {
    expect([...PUBLIC_ROUTES]).toEqual(["index", "login", "dev/api-smoke"]);
  });

  it("src/app의 모든 라우트 파일이 공개 또는 보호 목록에 정확히 한 번 등재돼 있다 (D9)", () => {
    const registered = [...PUBLIC_ROUTES, ...PROTECTED_ROUTES];

    expect([...registered].sort()).toEqual([...fileRoutes].sort());
    expect(new Set(registered).size).toBe(registered.length);
  });

  it("_layout.tsx가 Stack.Protected 안에 PROTECTED_ROUTES를 등재한다 (D1)", () => {
    const layout = readFileSync(`${appDir}_layout.tsx`, "utf8");

    expect(layout).toContain("<Stack.Protected");
    expect(layout).toMatch(
      /import\s*\{[^}]*PROTECTED_ROUTES[^}]*\}\s*from\s*"\.\.\/features\/auth\/model\/app-entry"/,
    );
    expect(layout).toContain("PROTECTED_ROUTES.map(");
  });
});
