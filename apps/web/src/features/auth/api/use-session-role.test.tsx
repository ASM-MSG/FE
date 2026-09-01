import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { queryWrapper } from "@/test/query-wrapper";
import { stubFetch } from "@/test/stub-fetch";
import { useSessionRole } from "./use-session-role";

/** getMe 응답 — 콘솔 가드가 읽는 필드는 role뿐이라 나머지는 계약상 최소값 */
const meResponse = (role: "USER" | "ORG" | "ADMIN") =>
  envelopeResponse({
    email: "tourism@busan.go.kr",
    nickname: "부산광역시 관광마이스과",
    profileImageUrl: null,
    createdAt: "2026-08-01T00:00:00Z",
    locationConsent: true,
    role,
  });

/** 실패 경로는 기본 재시도(3회 백오프)에 막히지 않게 retry를 끈 클라이언트로 본다 */
const noRetryWrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useSessionRole — getMe 캐시에서 세션 role 노출 (AC 6)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("로그인 세션이면 getMe 응답의 role을 노출한다 (AC 6)", async () => {
    signInForTest();
    stubFetch(() => meResponse("ORG"));

    const { result } = renderHook(() => useSessionRole(), {
      wrapper: queryWrapper,
    });

    await waitFor(() => expect(result.current.role).toBe("ORG"));
    expect(result.current.isPending).toBe(false);
  });

  it("ADMIN 세션도 그대로 노출한다 (AC 6)", async () => {
    signInForTest();
    stubFetch(() => meResponse("ADMIN"));

    const { result } = renderHook(() => useSessionRole(), {
      wrapper: queryWrapper,
    });

    await waitFor(() => expect(result.current.role).toBe("ADMIN"));
  });

  it("비로그인이면 쿼리를 발사하지 않고 role이 null이다 (AC 6)", async () => {
    signOutForTest();
    const received = stubFetch(() => meResponse("USER"));

    const { result } = renderHook(() => useSessionRole(), {
      wrapper: queryWrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.role).toBeNull();
    expect(received).toHaveLength(0);
  });

  it("조회가 실패하면 role은 null로 확정된다 — 가드가 로딩에 갇히지 않는다 (AC 7·8 전제)", async () => {
    signInForTest();
    stubFetch(() => errorEnvelope(2401, "인증 실패", 401));

    const { result } = renderHook(() => useSessionRole(), {
      wrapper: noRetryWrapper,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.role).toBeNull();
  });
});
