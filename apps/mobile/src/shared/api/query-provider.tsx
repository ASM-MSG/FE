import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shouldRetryQuery } from "./api-error";

/**
 * 앱 전역 TanStack Query 프로바이더 (AC 1) — 웹 `app/QueryProvider.tsx` 이식, 정책 동일.
 *
 * - staleTime 30초 — 도메인별 오버라이드는 각 화면 연동 티켓(MSG-422~431)에서
 * - retry: 네트워크 오류·5xx만 최대 2회, 4xx는 0회 (판정은 shouldRetryQuery 순수 함수)
 *
 * 배치: 웹의 app 레이어 대응물이지만 `src/app/`은 expo-router가 **라우트 파일 전용**으로
 * 스캔하므로(기본 export 컴포넌트가 아닌 파일은 라우트 경고를 유발) shared/api에 둔다.
 */
export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: shouldRetryQuery,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
