import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./styles/globals.css";
import { router } from "./app/router.tsx";
import { QueryProvider } from "./app/QueryProvider.tsx";
import { registerApiErrorInterceptor } from "./shared/api/error-interceptor.ts";

// API 에러 정규화 인터셉터 — 부트스트랩에서 1회 등록 (MSG-323)
registerApiErrorInterceptor();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </StrictMode>,
);
