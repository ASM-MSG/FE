import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import {
  useSessionRole,
  type SessionRole,
} from "@/features/auth/api/use-session-role";
import { ConsoleGuardFallback } from "./ConsoleGuardFallback";
import { useMustChangeGate } from "./use-must-change-gate";

interface ConsoleRoleGuardProps {
  children: ReactNode;
  /** 통과 판정 — 확정된 role(비로그인·조회 실패는 null)을 받는다 */
  allows: (role: SessionRole | null) => boolean;
  /** 통과하지 못한 세션에 보여줄 화면 — 회송(Navigate)이든 위장 렌더든 가드마다 다르다 */
  reject: ReactNode;
}

/**
 * 콘솔 보호 라우트 가드 공통 골격 (MSG-541 AC 7·8·9) — 판정 순서가 두 콘솔에서 같다:
 * ① role 확정 대기(자리표시) → ② role 통과 판정 → ③ mustChange 게이트 → ④ 본문.
 *
 * 운영자·관리자 가드는 ②의 통과 집합과 거부 화면만 다르므로 그 둘만 주입받는다 —
 * 순서가 갈리면 한쪽에서 권한 없는 세션에 콘솔이 한 프레임 노출되거나 mustChange 게이트가
 * 빠지는데, 그 위험을 두 파일에 복제해 두지 않는다.
 */
export const ConsoleRoleGuard = ({
  children,
  allows,
  reject,
}: ConsoleRoleGuardProps) => {
  const { role, isPending } = useSessionRole();
  // 통과 판정과 AND — 거부될 세션(예: ORG의 /admin 진입)에 status 요청을 내보내지 않는다
  const mustChangeRedirect = useMustChangeGate(allows(role));

  if (isPending) return <ConsoleGuardFallback />;
  if (!allows(role)) return reject;
  if (mustChangeRedirect !== null) {
    return <Navigate to={mustChangeRedirect} replace />;
  }
  return children;
};
