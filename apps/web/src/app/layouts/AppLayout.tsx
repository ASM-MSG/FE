import { Outlet, useNavigate } from "react-router-dom";
import { ROUTES } from "@/app/routes";
import { LoginModal } from "@/features/auth/ui/LoginModal";
import { useLocationConsentGate } from "@/features/profile/model/use-location-consent-gate";
import { LocationConsentScreen } from "@/features/profile/ui/LocationConsentScreen";
import { PushNoticeHost } from "@/features/notifications/ui/PushNoticeHost";
import { UploadModal } from "@/features/upload/ui/UploadModal";
import { SideRailNav } from "@/widgets/side-rail-nav/SideRailNav";

/** 웹 공통 셸 — 좌측 SideRail 고정, 나머지 영역에 페이지(Outlet) 렌더링 */
export const AppLayout = () => {
  // 위치정보 동의 온보딩 게이트 (MSG-407) — 로그인 + locationConsent=false면 어느
  // 라우트든 앱 콘텐츠 대신 전면 동의 화면 (라우트 신설 없음 — 딥링크 우회 방지, 추정 1).
  // LoginModal 상주 렌더처럼 features UI를 app 레이어가 조립하는 관례 미러
  const showConsentGate = useLocationConsentGate();
  const navigate = useNavigate();
  if (showConsentGate) {
    // 로그아웃 시 보호 라우트(RequireAuth)의 홈 추방+로그인 모달 경로를 타지 않도록
    // 게이트 이탈과 함께 홈으로 보낸다 (기준 11 — 비로그인 홈 화면)
    return <LocationConsentScreen onLoggedOut={() => navigate(ROUTES.home)} />;
  }
  return (
    <div className="flex h-dvh bg-background">
      <SideRailNav />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {/* 두 진입점(사이드레일·지도 FAB) 공통 조상에 1회 마운트 — 열림 상태는 전역 스토어 (Q2) */}
      <UploadModal />
      {/* 로그아웃 상태 프로필 클릭 진입 — 업로드 모달과 동일 레벨 1회 마운트 (MSG-46 후속 2 G1) */}
      <LoginModal />
      {/* 푸시 상주 호스트 (MSG-408) — 자동 토큰 동기화 + 포그라운드 토스트. 셸 분기
          내부라 위치동의 게이트 표시 중에는 마운트되지 않는다 (AC 3) */}
      <PushNoticeHost />
    </div>
  );
};
