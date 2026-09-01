import type { ComponentType } from "react";
import {
  Navigate,
  createBrowserRouter,
  type RouteObject,
} from "react-router-dom";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { AppLayout } from "@/app/layouts/AppLayout";
import { RequireAuth } from "@/app/RequireAuth";
import { RouteErrorBoundary } from "@/app/RouteErrorBoundary";
import { KAKAO_CALLBACK_PATH, ROUTES } from "@/app/routes";
import { AiRoutePage } from "@/pages/ai-route/AiRoutePage";
import { DexPanel } from "@/pages/dex/DexPanel";
import { MapHomePage } from "@/pages/map-home/MapHomePage";
import { KakaoCallbackPage } from "@/pages/oauth-callback/KakaoCallbackPage";
import { ProfilePanel } from "@/pages/profile/ProfilePanel";
import { MapShell } from "@/widgets/map-shell/MapShell";
import { SectionPanel } from "@/widgets/section-panel/SectionPanel";

/**
 * 콘솔 청크 로더 (MSG-541 AC 3) — 콘솔 라우트 전부가 같은 모듈을 dynamic import하므로
 * 콘솔 코드는 한 청크로 묶이고, 유저 앱 진입 시에는 로드되지 않는다.
 * react-router v7의 route-level `lazy`를 쓴다 — 컴포넌트 참조가 정적으로 남지 않는다.
 */
const consoleBundle = () => import("@/app/console/console-bundle");
type ConsoleBundle = Awaited<ReturnType<typeof consoleBundle>>;

const lazyConsole =
  (pick: (bundle: ConsoleBundle) => ComponentType) => async () => ({
    Component: pick(await consoleBundle()),
  });

/**
 * 운영자·관리자 콘솔 서브트리 (MSG-541 AC 2) — 스텁 라우트 정본 16경로.
 *
 * AppLayout의 **형제(최상위)**다: AppLayout 아래에 두면 콘솔 세션도 위치동의 게이트
 * (MSG-407)와 사이드레일 내비·로그인 모달을 상속한다. MapShell 밖이기도 하다.
 * 자식 경로는 CONSOLE_ROUTES 상수를 그대로 쓴다(절대 경로 — 부모 경로를 연장한다).
 *
 * 이 배열과 console-routes.ts는 웨이브 내 후속 티켓(542~554)의 수정 금지 대상이다
 * — 후속 티켓은 자기 스텁 페이지 파일만 교체한다(병렬 워크트리 충돌 방지).
 * export는 라우팅 스모크(console-routing.smoke.test.tsx)가 실제 등록을 마운트하기 위함이다.
 */
export const consoleRoutes: RouteObject[] = [
  {
    path: CONSOLE_ROUTES.orgHome,
    errorElement: <RouteErrorBoundary />,
    lazy: lazyConsole((bundle) => bundle.ConsoleRoot),
    children: [
      // 공개 — 비로그인 접근 가능, 콘솔 셸 밖 (AC 7)
      {
        path: CONSOLE_ROUTES.orgLogin,
        lazy: lazyConsole((bundle) => bundle.OrgLoginPage),
      },
      {
        path: CONSOLE_ROUTES.orgPasswordReset,
        lazy: lazyConsole((bundle) => bundle.OrgPasswordResetPage),
      },
      {
        path: CONSOLE_ROUTES.orgAccountRequest,
        lazy: lazyConsole((bundle) => bundle.OrgAccountRequestPage),
      },
      // 보호 — 콘솔 세션 전용, 공통 셸 안 (AC 4·5)
      {
        lazy: lazyConsole((bundle) => bundle.OrgConsoleLayout),
        children: [
          { index: true, lazy: lazyConsole((bundle) => bundle.OrgHomePage) },
          {
            path: CONSOLE_ROUTES.orgPasswordSetup,
            lazy: lazyConsole((bundle) => bundle.OrgPasswordSetupPage),
          },
          {
            path: CONSOLE_ROUTES.orgSubmissionNew,
            lazy: lazyConsole((bundle) => bundle.OrgSubmissionWizardPage),
          },
          {
            path: CONSOLE_ROUTES.orgSubmissions,
            lazy: lazyConsole((bundle) => bundle.OrgSubmissionsPage),
          },
          {
            path: CONSOLE_ROUTES.orgSubmissionDetail,
            lazy: lazyConsole((bundle) => bundle.OrgSubmissionDetailPage),
          },
          {
            // 반려 재신청은 위저드 수정 모드 — 스텁은 위저드 페이지를 재사용한다
            path: CONSOLE_ROUTES.orgSubmissionEdit,
            lazy: lazyConsole((bundle) => bundle.OrgSubmissionWizardPage),
          },
          {
            path: CONSOLE_ROUTES.orgSettings,
            lazy: lazyConsole((bundle) => bundle.OrgSettingsPage),
          },
          {
            path: CONSOLE_ROUTES.orgGuide,
            lazy: lazyConsole((bundle) => bundle.OrgGuidePage),
          },
        ],
      },
    ],
  },
  {
    path: CONSOLE_ROUTES.adminHome,
    errorElement: <RouteErrorBoundary />,
    lazy: lazyConsole((bundle) => bundle.ConsoleRoot),
    children: [
      {
        lazy: lazyConsole((bundle) => bundle.AdminConsoleLayout),
        children: [
          // 관리자 홈 화면 티켓이 없어 심사 큐를 기본 착지로 삼는다 (추정 4)
          {
            index: true,
            element: <Navigate to={CONSOLE_ROUTES.adminReview} replace />,
          },
          {
            path: CONSOLE_ROUTES.adminAccounts,
            lazy: lazyConsole((bundle) => bundle.AdminAccountsPage),
          },
          {
            path: CONSOLE_ROUTES.adminReview,
            lazy: lazyConsole((bundle) => bundle.AdminReviewQueuePage),
          },
          {
            path: CONSOLE_ROUTES.adminReviewDetail,
            lazy: lazyConsole((bundle) => bundle.AdminReviewDetailPage),
          },
          {
            path: CONSOLE_ROUTES.adminEvents,
            lazy: lazyConsole((bundle) => bundle.AdminEventsPage),
          },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter([
  // 로그인은 라우트가 아니라 모달(LoginModal, AppLayout 마운트)이다 — MSG-46 후속 2 G7.
  // /login 직접 진입은 무매칭이라 아래 errorElement 화면으로 수렴한다 (신규 404 페이지 없음)
  {
    element: <AppLayout />,
    // 렌더·로더 오류와 무매칭 경로(404)가 라우터 기본 화면(스택 노출) 대신 이 화면으로 수렴한다
    errorElement: <RouteErrorBoundary />,
    children: [
      // 모든 네비 섹션이 지속 지도 셸을 공유한다 — 각 섹션은 지도 위 사이드바 패널로 열리고
      // 닫으면(홈으로 복귀) 지도가 넓게 보인다. 지도는 라우트 전환에도 유지된다(D1).
      {
        element: <MapShell />,
        children: [
          { path: ROUTES.home, element: <MapHomePage /> },
          // /explore는 MSG-328에서 제거 — 직접 진입은 무매칭 404로 errorElement에 수렴한다 (AC 2)
          // AI 경로추천(MSG-488) — 서버가 익명 POST를 401(2403)로 막아 로그인 전용이다.
          // 레일 클릭은 SideRailNav가 모달로 막고, 이 래핑은 직접 URL 진입 방어다
          {
            path: ROUTES.aiRoute,
            element: (
              <RequireAuth>
                <AiRoutePage />
              </RequireAuth>
            ),
          },
          { path: ROUTES.upload, element: <SectionPanel title="업로드" /> },
          // 도감(MSG-121·122) — 탭은 URL 정본(/dex·/dex/badges), 무효 탭("gallery" 포함)은 지도 폴백(AC 2·21).
          // 비로그인 진입은 프로필과 동일하게 홈+로그인 모달 (MSG-328 사용자 피드백)
          {
            path: `${ROUTES.dex}/:tab?`,
            element: (
              <RequireAuth>
                <DexPanel />
              </RequireAuth>
            ),
          },
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
          // 알림 설정 상세(MSG-409)는 MSG-477 ①에서 제거 — /profile/notifications 직접
          // 진입은 무매칭(404)으로 errorElement에 수렴한다
        ],
      },
      // 카카오 OAuth 콜백 — 지도 셸 밖이다. 인가 직후 잠깐 머무는 화면이라 지도를
      // 다시 마운트할 이유가 없고, 셸 안에 두면 패널 자리에 갇혀 보인다 (MSG-325)
      { path: KAKAO_CALLBACK_PATH, element: <KakaoCallbackPage /> },
    ],
  },
  // 운영자·관리자 콘솔 (MSG-541) — AppLayout 형제. 무매칭 404는 종전대로 첫 라우트
  // (AppLayout)의 errorElement로 수렴하므로 이 배열의 순서를 앞으로 옮기지 않는다
  ...consoleRoutes,
]);
