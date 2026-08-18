import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { RequireAuth } from "./RequireAuth";
import { router } from "./router";
import { NOTIFICATION_SETTINGS_PATH, ROUTES } from "./routes";

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

  it("/profile/notifications 라우트가 등록되고 RequireAuth로 감싸여 있다 (MSG-409 AC 3)", () => {
    const notificationsRoute = findByPath(
      router.routes as RouteNode[],
      NOTIFICATION_SETTINGS_PATH,
    );

    expect(notificationsRoute).toBeDefined();
    expect(elementType(notificationsRoute)).toBe(RequireAuth);
  });
});
