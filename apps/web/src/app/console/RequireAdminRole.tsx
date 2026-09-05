import type { ReactNode } from "react";
import { RouteErrorBoundary } from "@/app/RouteErrorBoundary";
import { ConsoleRoleGuard } from "./ConsoleRoleGuard";

/**
 * 관리자 콘솔 은닉 가드 (MSG-541 AC 8).
 *
 * ADMIN이 아닌 모든 세션(USER·ORG는 물론 **비로그인도** — 추정 2)에 대해 기존 404 화면과
 * 동일 외형으로 위장 렌더한다. URL은 그대로 두고(리다이렉트 없음), 콘솔의 존재도 로그인
 * 유도도 노출하지 않는다 — 비로그인을 로그인으로 보내면 그 자체가 `/admin`의 존재를 알린다.
 *
 * 위장 화면은 `RouteErrorBoundary`를 그대로 렌더한다: 404 외형을 복제하면 두 화면이
 * 갈라지고, 그 화면은 라우트 에러를 읽지 않으므로(useRouteError 미사용) 일반 렌더가 가능하다.
 * noindex·탭 제목도 그 화면이 이미 갖고 있다.
 *
 * 보안선은 서버 role 인가다 — 이 가드는 노출 억제만 담당한다(티켓 확정).
 */
export const RequireAdminRole = ({ children }: { children: ReactNode }) => (
  <ConsoleRoleGuard
    allows={(role) => role === "ADMIN"}
    reject={<RouteErrorBoundary />}
  >
    {children}
  </ConsoleRoleGuard>
);
