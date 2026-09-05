import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useSessionRole } from "@/features/auth/api/use-session-role";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import { getStatusOptions } from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 첫 로그인 비밀번호 강제 설정 게이트 (MSG-541 AC 9) — 강제 이동해야 할 경로, 아니면 null.
 *
 * `GET /api/auth/password/status`의 mustChange=true면 어떤 콘솔 보호 라우트로 진입해도
 * `/org/password/setup`으로 보낸다. 대상은 **콘솔 세션(ORG·ADMIN 공통)**이다 —
 * 서버에 admin resend-password가 있어 ADMIN 계정도 초기 비밀번호 상태가 설 수 있고,
 * 착지 화면은 두 role이 공용한다 (스펙 질문 8 확정).
 *
 * 게이트는 **서버 확답에서만 발동**한다: 로딩·조회 실패는 통과다(mustChange를 모른다고
 * 콘솔을 막으면 상태 API 장애가 콘솔 전면 차단이 된다). 재시도를 끄는 이유도 같다 —
 * 게이트 판정을 백오프만큼 늦추는 이득이 없다.
 *
 * 착지 경로 자신에서는 null을 돌려준다 — 그러지 않으면 setup 화면이 자기 자신으로
 * 무한 리다이렉트된다. app 레이어 라우팅 코드라 라우터 참조는 경계 규칙 안이다.
 *
 * `enabled`는 호출자(가드)의 통과 판정과 AND로 묶인다 — Rules of Hooks 때문에 가드가
 * 거부할 세션에서도 훅 자체는 호출되는데, 그 세션에까지 status 요청을 내보낼 이유가
 * 없다(PR #116 리뷰 반영). 거부 화면은 게이트 판정보다 먼저 렌더되므로 동작은 불변이다.
 */
export const useMustChangeGate = (enabled: boolean = true): string | null => {
  const { role } = useSessionRole();
  const { pathname } = useLocation();
  const isConsoleSession = role === "ORG" || role === "ADMIN";
  const { data } = useQuery({
    ...getStatusOptions(),
    enabled: isConsoleSession && enabled,
    retry: false,
    select: unwrapEnvelope,
  });

  if (data?.mustChange !== true) return null;
  if (pathname === CONSOLE_ROUTES.orgPasswordSetup) return null;
  return CONSOLE_ROUTES.orgPasswordSetup;
};
