import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 프로필 이미지 삭제의 요청·캐시 갱신 계약 (기준 15의 훅 부분).
 * RN 렌더 인프라가 없어 훅이 넘기는 옵션 객체를 MutationObserver로 구동한다.
 * 응답 본문은 쓰지 않고 getMe 무효화로 아바타를 갱신한다(웹 useRemoveProfileImage 미러) —
 * 그 계약을 "seed된 getMe 쿼리가 무효 표시되는가"로 관찰한다.
 */

const API_BASE = "https://api.test.local";

const loadRemoveProfileImage = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { removeProfileImageMutationOptions } =
    await import("./use-remove-profile-image");
  const { getMeQueryKey } = await import("../../../shared/api/query-options");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const observer = new MutationObserver(
    queryClient,
    removeProfileImageMutationOptions(queryClient),
  );
  const seedMe = () =>
    queryClient.setQueryData(getMeQueryKey(), {
      developCode: 0,
      message: "ok",
      data: {
        email: "fillmapper@fillmap.app",
        nickname: "필맵퍼",
        profileImageUrl: "https://cdn/a.jpg",
        createdAt: "2026-01-12T00:00:00",
        locationConsent: true,
      },
    });
  const meInvalidated = () =>
    queryClient.getQueryState(getMeQueryKey())?.isInvalidated ?? false;
  const cachedImageUrl = () =>
    (
      queryClient.getQueryData(getMeQueryKey()) as
        | { data: { profileImageUrl: string | null } }
        | undefined
    )?.data.profileImageUrl;
  return { observer, seedMe, meInvalidated, cachedImageUrl };
};

const stubFetch = (route: () => Response) => {
  const received: Array<{ method: string; pathname: string }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      received.push({
        method: input.method,
        pathname: new URL(input.url).pathname,
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

describe("프로필 이미지 삭제 (기준 15)", () => {
  it("DELETE /api/users/me/profile-image가 발사된다 (기준 15)", async () => {
    const { observer, seedMe } = await loadRemoveProfileImage();
    seedMe();
    const received = stubFetch(() =>
      envelopeResponse({ profileImageUrl: null }),
    );

    await observer.mutate();

    expect(received).toEqual([
      { method: "DELETE", pathname: "/api/users/me/profile-image" },
    ]);
  });

  it("성공하면 프로필 조회가 무효화돼 아바타가 기본 이미지로 갱신된다 (기준 15)", async () => {
    const { observer, seedMe, meInvalidated } = await loadRemoveProfileImage();
    seedMe();
    stubFetch(() => envelopeResponse({ profileImageUrl: null }));

    await observer.mutate();

    expect(meInvalidated()).toBe(true);
  });

  it("성공하면 캐시의 profileImageUrl이 즉시 null이 된다 — 재조회가 실패해도 지워진 사진이 화면에 남지 않는다 (codex 리뷰)", async () => {
    const { observer, seedMe, cachedImageUrl } = await loadRemoveProfileImage();
    seedMe();
    stubFetch(() => envelopeResponse({ profileImageUrl: null }));

    await observer.mutate();

    expect(cachedImageUrl()).toBeNull();
  });

  it("실패하면 프로필 조회를 무효화하지도, 캐시를 건드리지도 않는다 — 화면이 이전 이미지를 유지한다 (기준 15)", async () => {
    const { observer, seedMe, meInvalidated, cachedImageUrl } =
      await loadRemoveProfileImage();
    seedMe();
    stubFetch(() => errorEnvelope(9999, "삭제 실패", 500));

    await expect(observer.mutate()).rejects.toThrow();

    expect(meInvalidated()).toBe(false);
    expect(cachedImageUrl()).toBe("https://cdn/a.jpg");
  });
});
