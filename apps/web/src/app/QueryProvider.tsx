import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shouldRetryQuery } from "@/shared/api/api-error";

/**
 * 앱 전역 TanStack Query 프로바이더 — 클라이언트를 한 번만 생성해 재마운트에도 유지.
 *
 * 전역 기본 정책 (MSG-323 수용 기준 8):
 * - staleTime 30초 — 도메인별 오버라이드는 각 연동 티켓(MSG-325~329)에서
 * - retry: 네트워크 오류·5xx만 최대 2회, 4xx는 0회 (판정은 shouldRetryQuery 순수 함수)
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
