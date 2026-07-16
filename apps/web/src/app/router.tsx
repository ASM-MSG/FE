import { createBrowserRouter } from "react-router-dom";
import App from "@/App";
import { AppLayout } from "@/app/layouts/AppLayout";
import { ROUTES } from "@/app/routes";
import { PlaceholderPage } from "@/pages/placeholder/PlaceholderPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // TODO: MSG-110 맵 홈 구현 시 데모 페이지(App)를 대체
      { path: ROUTES.home, element: <App /> },
      { path: ROUTES.explore, element: <PlaceholderPage title="탐색" /> },
      { path: ROUTES.upload, element: <PlaceholderPage title="업로드" /> },
      { path: ROUTES.dex, element: <PlaceholderPage title="도감" /> },
      { path: ROUTES.profile, element: <PlaceholderPage title="프로필" /> },
    ],
  },
]);
