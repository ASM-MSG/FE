import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./styles/globals.css";
import { router } from "./app/router.tsx";
import { QueryProvider } from "./app/QueryProvider.tsx";
import { useAuthStore } from "./features/auth/model/auth-store.ts";
import { useLoginModalStore } from "./features/auth/model/login-modal-store.ts";
import { configureAuthPipeline } from "./shared/api/auth-pipeline.ts";
import { registerApiErrorInterceptor } from "./shared/api/error-interceptor.ts";

// API 에러 정규화 인터셉터 — 부트스트랩에서 1회 등록 (MSG-323)
registerApiErrorInterceptor();

// 인증 파이프라인 배선 — shared(파이프라인)와 features(스토어·모달)의 연결은 app 레이어 몫 (MSG-324, FSD)
configureAuthPipeline({
  getAccessToken: () => useAuthStore.getState().accessToken,
  onTokenRefreshed: (accessToken) =>
    useAuthStore.getState().setAccessToken(accessToken),
  // 세션 만료 = 재발급 실패 — 토큰을 비우고 재로그인 모달을 연다 (수용 기준 5)
  onSessionExpired: () => {
    useAuthStore.getState().logout();
    useLoginModalStore.getState().openModal();
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  </StrictMode>,
);
