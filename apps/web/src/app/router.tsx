import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/app/layouts/AppLayout";
import { ROUTES } from "@/app/routes";
import { MapHomePage } from "@/pages/map-home/MapHomePage";
import { PlaceholderPage } from "@/pages/placeholder/PlaceholderPage";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: ROUTES.home, element: <MapHomePage /> },
      { path: ROUTES.explore, element: <PlaceholderPage title="탐색" /> },
      { path: ROUTES.upload, element: <PlaceholderPage title="업로드" /> },
      { path: ROUTES.dex, element: <PlaceholderPage title="도감" /> },
      { path: ROUTES.profile, element: <PlaceholderPage title="프로필" /> },
    ],
  },
]);
