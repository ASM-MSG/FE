import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 닉네임 저장의 요청·후속 계약 (결정 E2-b).
 * RN 렌더 인프라가 없어 훅이 넘기는 옵션 객체를 MutationObserver로 구동한다.
 * 검증이 "형제 mutation 3종은 전부 팩토리로 분리해 검증했는데 이것만 빠졌다"고 지적해
 * 같은 구조로 맞추고 채웠다.
 */

const API_BASE = "https://api.test.local";

const loadUpdateNickname = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { updateNicknameMutationOptions } =
    await import("./use-update-nickname");
  const { getMeQueryKey } = await import("../../../shared/api/query-options");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onSaved = vi.fn();
  const observer = new MutationObserver(
    queryClient,
    updateNicknameMutationOptions(queryClient, { onSaved }),
  );
  queryClient.setQueryData(getMeQueryKey(), {
    developCode: 0,
    message: "ok",
    data: {
      email: "fillmapper@fillmap.app",
      nickname: "이전닉",
      profileImageUrl: null,
      createdAt: "2026-01-12T00:00:00",
      locationConsent: true,
    },
  });
  const meInvalidated = () =>
    queryClient.getQueryState(getMeQueryKey())?.isInvalidated ?? false;
  return { observer, onSaved, meInvalidated };
};

const stubFetch = (route: () => Response) => {
  const received: Array<{
    method: string;
    pathname: string;
    body: string | null;
  }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      received.push({
        method: input.method,
        pathname: new URL(input.url).pathname,
        body: await input.clone().text(),
      });
      return route();
    }),
  );
  return received;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("닉네임 저장 (결정 E2-b)", () => {
  it("PUT /api/users/me/nickname에 새 닉네임을 담아 발사된다", async () => {
    const { observer } = await loadUpdateNickname();
    const received = stubFetch(() => envelopeResponse({ nickname: "필맵퍼" }));

    await observer.mutate("필맵퍼");

    expect(received).toEqual([
      {
        method: "PUT",
        pathname: "/api/users/me/nickname",
        body: JSON.stringify({ nickname: "필맵퍼" }),
      },
    ]);
  });

  it("성공하면 프로필 조회가 무효화되고 화면 복귀가 불린다 — 프로필 카드가 새 닉네임으로 갱신된다", async () => {
    const { observer, onSaved, meInvalidated } = await loadUpdateNickname();
    stubFetch(() => envelopeResponse({ nickname: "필맵퍼" }));

    await observer.mutate("필맵퍼");

    expect(meInvalidated()).toBe(true);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("실패하면 화면 복귀가 불리지 않는다 — 편집 화면이 유지돼 재시도할 수 있다", async () => {
    const { observer, onSaved, meInvalidated } = await loadUpdateNickname();
    stubFetch(() => errorEnvelope(9999, "저장 실패", 500));

    await expect(observer.mutate("필맵퍼")).rejects.toThrow();

    expect(onSaved).not.toHaveBeenCalled();
    expect(meInvalidated()).toBe(false);
  });
});
