import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

/**
 * 테스트 전용 렌더 헬퍼 — 쿼리 클라이언트 + 메모리 라우터 스캐폴딩.
 * 화면 스모크가 매번 같은 프로바이더 스택을 복제하던 것을 걷어낸다(중복 게이트 검출).
 * 쿼리 클라이언트는 케이스마다 새로 만든다 — 테스트 간 캐시 격리.
 */
export const renderWithProviders = (ui: ReactNode, route = "/") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
