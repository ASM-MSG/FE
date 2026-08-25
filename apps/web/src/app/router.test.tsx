import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { RequireAuth } from "./RequireAuth";
import { router } from "./router";
import { ROUTES } from "./routes";

/**
 * 보호 라우트 구성 테스트 — 어떤 라우트가 RequireAuth로 감싸였는지를 실제 라우터
 * 구성(router.routes)에서 단정한다. 가드의 동작 자체(홈 리다이렉트 + 로그인 모달,
 * 진입 시점 판정)는 require-auth.test.tsx가 고정하므로 여기서는 배선만 본다.
 */
type RouteNode = { path?: string; element?: unknown; children?: RouteNode[] };

const findByPath = (
  routes: RouteNode[],
  path: string,
): RouteNode | undefined => {
  for (const route of routes) {
    if (route.path === path) return route;
    const found = route.children ? findByPath(route.children, path) : undefined;
    if (found) return found;
  }
  return undefined;
};

const elementType = (route: RouteNode | undefined) =>
  route && isValidElement(route.element) ? route.element.type : undefined;

describe("보호 라우트 구성 — 비로그인 직접 진입은 RequireAuth가 홈+로그인 모달로 보낸다", () => {
  it("/dex 라우트가 RequireAuth로 감싸여 있다 (MSG-328 피드백 — 비로그인 도감 = 로그인 모달)", () => {
    const dexRoute = findByPath(
      router.routes as RouteNode[],
      `${ROUTES.dex}/:tab?`,
    );

    expect(dexRoute).toBeDefined();
    expect(elementType(dexRoute)).toBe(RequireAuth);
  });

  it("/profile 라우트의 RequireAuth 래핑이 유지된다 (MSG-46 R1 보존)", () => {
    const profileRoute = findByPath(
      router.routes as RouteNode[],
      ROUTES.profile,
    );

    expect(elementType(profileRoute)).toBe(RequireAuth);
  });

  // MSG-477 ①: 알림 설정 라우트(MSG-409) 제거 — 미등록 단정으로 교체. 직접 진입은
  // 무매칭(404)이라 루트 errorElement(RouteErrorBoundary)로 수렴한다 (A3)
  it("/profile/notifications 라우트가 등록되어 있지 않다 — 직접 진입은 404로 에러 화면에 수렴 (MSG-477 A3)", () => {
    expect(
      findByPath(router.routes as RouteNode[], "/profile/notifications"),
    ).toBeUndefined();
  });
});
