import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { getStatusQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import { useChangePassword } from "./use-password-mutations";

/**
 * MSG-544가 가산한 `useChangePassword`만 다룬다 — 542가 만든 3훅의 테스트 파일
 * (`use-password-mutations.test.tsx`)은 웨이브 규칙상 접촉하지 않는다.
 */
const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapperWith = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useChangePassword — 현재+새 비밀번호로 변경 (AC 7)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("현재 비밀번호와 새 비밀번호를 함께 보낸다 (AC 7)", async () => {
    signInForTest();
    const received = stubFetch(() => envelopeResponse(null));
    const { result } = renderHook(() => useChangePassword(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({
      currentPassword: "oldpass12",
      newPassword: "fillmap12",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received.at(-1)?.body).toEqual({
      currentPassword: "oldpass12",
      newPassword: "fillmap12",
    });
  });

  it("성공하면 비밀번호 상태 캐시가 무효화된다 — 서버가 강제 변경 상태를 푼다 (AC 7)", async () => {
    signInForTest();
    stubFetch(() => envelopeResponse(null));
    const client = createClient();
    client.setQueryData(getStatusQueryKey(), {
      developCode: 0,
      message: "ok",
      data: { mustChange: true },
    });
    const { result } = renderHook(() => useChangePassword(), {
      wrapper: wrapperWith(client),
    });

    result.current.mutate({
      currentPassword: "oldpass12",
      newPassword: "fillmap12",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() =>
      expect(client.getQueryState(getStatusQueryKey())?.isInvalidated).toBe(
        true,
      ),
    );
  });

  it("성공해도 로컬 세션은 유지된다 — 서버가 다른 기기 세션을 유지한다 (AC 7·추정 9)", async () => {
    signInForTest();
    stubFetch(() => envelopeResponse(null));
    const { result } = renderHook(() => useChangePassword(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({
      currentPassword: "oldpass12",
      newPassword: "fillmap12",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("현재 비밀번호 불일치는 오류로 노출되어 폼이 서버 message를 안내할 수 있다 (AC 7)", async () => {
    signInForTest();
    stubFetch(() =>
      errorEnvelope(1400, "현재 비밀번호가 일치하지 않습니다", 400),
    );
    const { result } = renderHook(() => useChangePassword(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({
      currentPassword: "wrongpass1",
      newPassword: "fillmap12",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
