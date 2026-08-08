import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { RequireAuth } from "@/app/RequireAuth";
import { KAKAO_CALLBACK_PATH, ROUTES } from "@/app/routes";
import { DexPanel } from "@/pages/dex/DexPanel";
import { ExplorePanel } from "@/pages/explore/ExplorePanel";
import { MapHomePage } from "@/pages/map-home/MapHomePage";
import { KakaoCallbackPage } from "@/pages/oauth-callback/KakaoCallbackPage";
import { ProfilePanel } from "@/pages/profile/ProfilePanel";
import { MapShell } from "@/widgets/map-shell/MapShell";
import { SectionPanel } from "@/widgets/section-panel/SectionPanel";

export const router = createBrowserRouter([
  // 로그인은 라우트가 아니라 모달(LoginModal, AppLayout 마운트)이다 — MSG-46 후속 2 G7.
  // /login 직접 진입은 라우터 기본 폴백(무매칭 에러 화면)을 따른다 (신규 404 페이지 없음)
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
          // 프로필(MSG-124) — 전고 사이드탭, 전부 mock 렌더 (실동작 없음).
          // 로그아웃 상태 직접 진입은 RequireAuth가 홈+로그인 모달로 보낸다 (PR #23 R1)
          {
            path: ROUTES.profile,
            element: (
              <RequireAuth>
                <ProfilePanel />
              </RequireAuth>
            ),
          },
        ],
      },
      // 카카오 OAuth 콜백 — 지도 셸 밖이다. 인가 직후 잠깐 머무는 화면이라 지도를
      // 다시 마운트할 이유가 없고, 셸 안에 두면 패널 자리에 갇혀 보인다 (MSG-325)
      { path: KAKAO_CALLBACK_PATH, element: <KakaoCallbackPage /> },
    ],
  },
]);
