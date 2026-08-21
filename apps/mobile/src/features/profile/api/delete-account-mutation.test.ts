import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 계정 삭제의 요청·세션 정리·실패 유지 계약 (기준 10).
 * RN 렌더 인프라가 없어 훅 대신 **훅이 그대로 넘기는 옵션 객체**를 MutationObserver로
 * 구동한다. 세션 종료(`authStore.logout`)는 옵션 인자로 주입되므로(expo-secure-store·
 * expo-router가 딸려 오는 auth-session을 테스트가 로드하지 않는다) 스파이로 관찰한다.
 */

const API_BASE = "https://api.test.local";

const loadDeleteAccount = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { deleteAccountMutationOptions } =
    await import("./delete-account-mutation");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const clearSession = vi.fn(async () => {});
  const onDeleted = vi.fn();
  const observer = new MutationObserver(
    queryClient,
    deleteAccountMutationOptions({ queryClient, clearSession, onDeleted }),
  );
  return { queryClient, observer, clearSession, onDeleted };
};

const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
) => {
  const received: Array<{ method: string; pathname: string }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      received.push({
        method: input.method,
        pathname: new URL(input.url).pathname,
      });
      return route(input);
    }),
  );
  return received;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("계정 삭제 (기준 10)", () => {
  it("확인하면 DELETE /api/users/me가 발사된다 (기준 10)", async () => {
    const { observer } = await loadDeleteAccount();
    const received = stubFetch(() => envelopeResponse(null));

    await observer.mutate();

    expect(received).toEqual([{ method: "DELETE", pathname: "/api/users/me" }]);
  });

  it("성공하면 로컬 세션과 쿼리 캐시가 비워지고 이동 콜백이 불린다 (기준 10)", async () => {
    const { observer, queryClient, clearSession, onDeleted } =
      await loadDeleteAccount();
    queryClient.setQueryData(["stale-user-data"], { nickname: "삭제된 계정" });
    stubFetch(() => envelopeResponse(null));

    await observer.mutate();

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(["stale-user-data"])).toBeUndefined();
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("실패하면 세션이 유지되고 이동하지 않는다 — 모달이 남아 재시도할 수 있다 (기준 10)", async () => {
    const { observer, queryClient, clearSession, onDeleted } =
      await loadDeleteAccount();
    queryClient.setQueryData(["stale-user-data"], { nickname: "필맵퍼" });
    stubFetch(() => errorEnvelope(9999, "삭제 실패", 500));

    await expect(observer.mutate()).rejects.toThrow();

    expect(clearSession).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["stale-user-data"])).toEqual({
      nickname: "필맵퍼",
    });
    expect(observer.getCurrentResult().isError).toBe(true);
  });
});
