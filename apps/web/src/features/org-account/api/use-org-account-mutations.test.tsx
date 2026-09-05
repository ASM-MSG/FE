import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getProfileQueryKey } from "@/shared/api/generated/@tanstack/react-query.gen";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { envelopeResponse, errorEnvelope } from "@/test/envelope-response";
import { stubFetch } from "@/test/stub-fetch";
import {
  useRequestEmailChange,
  useUpdateOrgProfile,
} from "./use-org-account-mutations";

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapperWith = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const UPDATED = {
  email: "tourism@busan.go.kr",
  contactName: "김민지 주무관",
  contactPhone: "051-888-0000",
};

describe("useUpdateOrgProfile — 담당자 정보 저장 (AC 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("이름·연락처 두 값을 함께 보낸다 — 부분 PATCH가 아니다 (AC 4)", async () => {
    signInForTest();
    const received = stubFetch(() => envelopeResponse(UPDATED));
    const { result } = renderHook(() => useUpdateOrgProfile(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({
      contactName: "김민지 주무관",
      contactPhone: "051-888-0000",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received.at(-1)?.body).toEqual({
      contactName: "김민지 주무관",
      contactPhone: "051-888-0000",
    });
  });

  it("성공하면 프로필 캐시가 응답으로 갱신된다 — 재조회 없이 사이드바와 일치 (AC 4)", async () => {
    signInForTest();
    stubFetch(() => envelopeResponse(UPDATED));
    const client = createClient();
    client.setQueryData(getProfileQueryKey(), {
      developCode: 0,
      message: "ok",
      data: { ...UPDATED, contactName: "이전 담당자", contactPhone: null },
    });
    const { result } = renderHook(() => useUpdateOrgProfile(), {
      wrapper: wrapperWith(client),
    });

    result.current.mutate({
      contactName: "김민지 주무관",
      contactPhone: "051-888-0000",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(getProfileQueryKey())).toMatchObject({
      data: { contactName: "김민지 주무관", contactPhone: "051-888-0000" },
    });
  });

  it("실패는 오류로 노출되어 폼이 안내할 수 있다 (AC 4)", async () => {
    signInForTest();
    stubFetch(() =>
      errorEnvelope(1400, "연락처 형식이 올바르지 않습니다", 400),
    );
    const { result } = renderHook(() => useUpdateOrgProfile(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({ contactName: "김민지", contactPhone: "051" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useRequestEmailChange — 아이디 변경 요청 접수 (AC 8·9)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    signOutForTest();
  });

  it("바꾸려는 이메일 1필드만 보낸다 — 사유 필드 없음 (AC 8)", async () => {
    signInForTest();
    const received = stubFetch(() => envelopeResponse(null));
    const { result } = renderHook(() => useRequestEmailChange(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({ requestedEmail: "new@busan.go.kr" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(received.at(-1)?.body).toEqual({
      requestedEmail: "new@busan.go.kr",
    });
  });

  it("실패는 오류로 노출되어 재제출을 안내할 수 있다 (AC 8)", async () => {
    signInForTest();
    stubFetch(() => errorEnvelope(1400, "이미 사용 중인 이메일입니다", 400));
    const { result } = renderHook(() => useRequestEmailChange(), {
      wrapper: wrapperWith(createClient()),
    });

    result.current.mutate({ requestedEmail: "taken@busan.go.kr" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
