import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ROUTES } from "@/app/routes";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";

/**
 * 뷰-레이어 라우트 가드 (MSG-46 PR #23 리뷰 R1) — 로그아웃 상태의 직접 진입
 * (주소창 입력·새로고침·뒤로가기)이 SideRail 클릭 분기(G1)를 우회해 보호 콘텐츠를
 * 렌더하지 못하게 막는다. 기존 "기본 화면 위 모달" 패턴과 일관되게 홈으로 보내고
 * 로그인 모달을 연다 (URL은 홈으로 — 프로필 콘텐츠는 렌더되지 않음).
 *
 * 판정은 진입(마운트) 시점 1회다 — 스토어를 구독하지 않는다. 렌더 중 로그아웃은
 * "패널에 머묾"이 확정 의도(MSG-46 후속 F2)라 반응형 가드로 만들면 로그아웃 클릭이
 * 즉시 홈 추방으로 오폭한다. app 레이어 라우팅 코드라 라우터 import는 경계 규칙 안이다.
 */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  // 마운트 시점 인증 스냅샷 — 이후 상태 변화에 반응하지 않는다 (F2 보존)
  const [allowedAtEntry] = useState(
    () => useAuthStore.getState().isAuthenticated,
  );
  const openLoginModal = useLoginModalStore((s) => s.openModal);

  useEffect(() => {
    if (!allowedAtEntry) openLoginModal();
  }, [allowedAtEntry, openLoginModal]);

  if (!allowedAtEntry) return <Navigate to={ROUTES.home} replace />;
  return children;
};
