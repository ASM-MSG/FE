import { type ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { shouldRetryQuery } from "@/shared/api/api-error";

/**
 * 앱 전역 TanStack Query 프로바이더 — 클라이언트를 한 번만 생성해 재마운트에도 유지.
 *
 * 전역 기본 정책 (MSG-323 수용 기준 8):
 * - staleTime 30초 — 도메인별 오버라이드는 각 연동 티켓(MSG-325~329)에서
 * - retry: 네트워크 오류·5xx만 최대 2회, 4xx는 0회 (판정은 shouldRetryQuery 순수 함수)
 *
 * 인증 전이 캐시 정리 (MSG-474 AC 6): 비로그인도 공개 조회 캐시를 갖게 되면서, 인증이
 * true → false로 전이하면(로그아웃·세션 만료 — 둘 다 스토어 전이는 이 한 곳을 지난다)
 * 캐시를 전량 비운다 — 로그인 훅들의 `queryClient.clear()`와 대칭이고, 쿼리 키에 인증
 * 상태를 넣는 대안은 사용자별 값이 섞이는 훅 10곳+의 키 확장이라 기각(스펙 추정 5).
 * 전이 구독 패턴은 start-ready-refresh의 로그아웃 감시와 같다.
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

  useEffect(
    () =>
      useAuthStore.subscribe((state, previous) => {
        // 토큰 회전(401 재발급)은 isAuthenticated를 건드리지 않는다 — 로그아웃만 잡는다
        if (previous.isAuthenticated && !state.isAuthenticated) {
          queryClient.clear();
        }
      }),
    [queryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
