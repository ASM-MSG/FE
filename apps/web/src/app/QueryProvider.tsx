import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** 앱 전역 TanStack Query 프로바이더 — 클라이언트를 한 번만 생성해 재마운트에도 유지 */
export const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
