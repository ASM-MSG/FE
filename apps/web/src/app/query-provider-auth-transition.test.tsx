import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { signInForTest, signOutForTest } from "@/test/auth-session";
import { QueryProvider } from "./QueryProvider";

/**
 * 인증 전이 캐시 정리 (MSG-474 AC 6) — 비로그인도 공개 조회 캐시를 갖게 되면서
 * 로그아웃·세션 만료(true → false) 시 사용자별 응답이 같은 키에 남으면 안 된다.
 * 로그인(false → true)은 기존 로그인 훅들의 `queryClient.clear()`가 담당한다 — 프로바이더는
 * 관여하지 않는다(대칭 유지 단정 포함).
 */
let captured: QueryClient | null = null;

const CaptureClient = () => {
  captured = useQueryClient();
  return null;
};

const renderProvider = (): QueryClient => {
  render(
    <QueryProvider>
      <CaptureClient />
    </QueryProvider>,
  );
  if (captured === null) throw new Error("QueryClient 캡처 실패");
  return captured;
};

afterEach(() => {
  captured = null;
  signOutForTest();
});

describe("QueryProvider — 인증 전이 캐시 정리 (MSG-474 AC 6)", () => {
  it("인증이 true → false로 전이하면(로그아웃·세션 만료) 캐시가 전량 비워진다", () => {
    signInForTest();
    const queryClient = renderProvider();
    queryClient.setQueryData(["getCell", { gridId: "39064_112221" }], {
      occupied: true,
    });

    act(() => signOutForTest());

    expect(
      queryClient.getQueryData(["getCell", { gridId: "39064_112221" }]),
    ).toBeUndefined();
  });

  it("false → true 전이(로그인)는 프로바이더가 비우지 않는다 — 로그인 훅의 clear()가 담당", () => {
    signOutForTest();
    const queryClient = renderProvider();
    queryClient.setQueryData(["publicList"], ["a"]);

    act(() => signInForTest());

    expect(queryClient.getQueryData(["publicList"])).toEqual(["a"]);
  });
});
