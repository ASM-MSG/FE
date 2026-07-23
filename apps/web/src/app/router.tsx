import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { ROUTES } from "@/app/routes";
import { DexPanel } from "@/pages/dex/DexPanel";
import { ExplorePanel } from "@/pages/explore/ExplorePanel";
import { LoginPage } from "@/pages/login/LoginPage";
import { MapHomePage } from "@/pages/map-home/MapHomePage";
import { ProfilePanel } from "@/pages/profile/ProfilePanel";
import { MapShell } from "@/widgets/map-shell/MapShell";
import { SectionPanel } from "@/widgets/section-panel/SectionPanel";

export const router = createBrowserRouter([
  // 로그인(MSG-46) — 미로그인 진입점이라 셸(AppLayout·MapShell) 밖 독립 라우트 (AC 1)
  { path: ROUTES.login, element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      // 모든 네비 섹션이 지속 지도 셸을 공유한다 — 각 섹션은 지도 위 사이드바 패널로 열리고
      // 닫으면(홈으로 복귀) 지도가 넓게 보인다. 지도는 라우트 전환에도 유지된다(D1).
      {
        element: <MapShell />,
        children: [
          { path: ROUTES.home, element: <MapHomePage /> },
          { path: ROUTES.explore, element: <ExplorePanel /> },
          { path: ROUTES.upload, element: <SectionPanel title="업로드" /> },
          // 도감(MSG-121·122) — 탭은 URL 정본(/dex·/dex/badges), 무효 탭("gallery" 포함)은 지도 폴백(AC 2·21)
          { path: `${ROUTES.dex}/:tab?`, element: <DexPanel /> },
          // 프로필(MSG-124) — 전고 사이드탭, 전부 mock 렌더 (실동작 없음)
          { path: ROUTES.profile, element: <ProfilePanel /> },
        ],
      },
    ],
  },
]);
