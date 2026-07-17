import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { ROUTES } from "@/app/routes";
import { ExplorePanel } from "@/pages/explore/ExplorePanel";
import { MapHomePage } from "@/pages/map-home/MapHomePage";
import { PlaceholderPage } from "@/pages/placeholder/PlaceholderPage";
import { MapShell } from "@/widgets/map-shell/MapShell";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // 홈/탐색은 지속 지도 셸을 공유해 라우트 전환에도 지도가 유지된다(D1)
      {
        element: <MapShell />,
        children: [
          { path: ROUTES.home, element: <MapHomePage /> },
          { path: ROUTES.explore, element: <ExplorePanel /> },
        ],
      },
      { path: ROUTES.upload, element: <PlaceholderPage title="업로드" /> },
      { path: ROUTES.dex, element: <PlaceholderPage title="도감" /> },
      { path: ROUTES.profile, element: <PlaceholderPage title="프로필" /> },
    ],
  },
]);
