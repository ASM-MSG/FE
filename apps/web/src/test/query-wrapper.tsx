import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * 훅 테스트 공용 QueryClient 래퍼 (기본 재시도 유지형) — renderHook마다 새 클라이언트라
 * 테스트 간 캐시가 격리된다. 같은 래퍼를 훅 테스트 여러 파일이 복제하게 되어 추출했다
 * (stub-fetch 선례 — 중복 게이트 검출). 에러 경로를 단정하는 테스트는 재시도 백오프
 * 타임아웃을 피하려 retry:false 클라이언트를 각자 정의한다 — 이 래퍼로 통합하지 않는다.
 */
export const queryWrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);
