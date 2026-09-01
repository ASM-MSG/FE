import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { ConsoleRoleGuard } from "./ConsoleRoleGuard";

/**
 * 운영자 콘솔 보호 라우트 가드 (MSG-541 AC 7·9).
 *
 * 통과 대상은 **콘솔 세션(ORG·ADMIN)**이다: mustChange 게이트가 ORG·ADMIN 공통이고
 * 착지 화면이 `/org/password/setup`(이 가드 아래)이라, ADMIN을 여기서 막으면 초기 비밀번호
 * 상태의 관리자가 착지 화면에서 다시 회송되어 갇힌다 (스펙 질문 8 확정의 귀결).
 *
 * 비로그인·USER role은 `/org/login`으로 replace 회송한다 — 권한 없음 안내 문구는
 * 로그인 화면(MSG-542) 몫이다 (추정 3). role 확정 전 자리표시·mustChange 게이트 순서는
 * 공통 골격(ConsoleRoleGuard)이 소유한다.
 *
 * 보안선은 서버 role 인가다 — 이 가드는 노출 억제만 담당한다(티켓 확정).
 */
export const RequireOrgRole = ({ children }: { children: ReactNode }) => (
  <ConsoleRoleGuard
    allows={(role) => role === "ORG" || role === "ADMIN"}
    reject={<Navigate to={CONSOLE_ROUTES.orgLogin} replace />}
  >
    {children}
  </ConsoleRoleGuard>
);
