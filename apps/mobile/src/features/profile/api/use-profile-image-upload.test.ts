import { MutationObserver, QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  envelopeResponse,
  errorEnvelope,
} from "../../../test/envelope-response";

/**
 * 템플릿 ③ 쿼리 훅(모바일 변형) — 프로필 이미지 업로드의 요청·캐시 계약 (MSG-564 기준 4·5).
 * RN 렌더 인프라가 없어 옵션 객체를 `MutationObserver`로 구동한다 (use-remove-profile-image 선례).
 * fetch는 네트워크 경계에서 한 번만 스텁하고 4경로(파일 uri 읽기·presign·S3 PUT·확정)를
 * URL로 라우팅한다 — 모듈 mock은 쓰지 않는다.
 */

const API_BASE = "https://api.test.local";
const FILE_URI = "file:///cache/photo.jpg";
const S3_URL = "https://s3.test/bucket/key-1?sig=1";
const ME = {
  email: "fillmapper@fillmap.app",
  nickname: "필맵퍼",
  profileImageUrl: "https://cdn/a.jpg",
  createdAt: "2026-01-12T00:00:00",
  locationConsent: true,
};
const CONFIRMED = { ...ME, profileImageUrl: "https://cdn/new.jpg" };
const VARIABLES = {
  uri: FILE_URI,
  candidate: { name: "photo.jpg", type: "image/jpeg", size: 3 },
};

const loadUpload = async () => {
  vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", API_BASE);
  vi.resetModules();
  const { profileImageUploadMutationOptions } =
    await import("./use-profile-image-upload");
  const { getMeQueryKey } = await import("../../../shared/api/query-options");
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const observer = new MutationObserver(
    queryClient,
    profileImageUploadMutationOptions(queryClient),
  );
  queryClient.setQueryData(getMeQueryKey(), {
    developCode: 0,
    message: "ok",
    data: ME,
  });
  const cachedMe = () =>
    (queryClient.getQueryData(getMeQueryKey()) as { data: typeof ME }).data;
  return { observer, cachedMe };
};

interface Received {
  method: string;
  url: string;
  contentType: string | null;
  bodyIsArrayBuffer: boolean;
}

/** 4경로 라우터 — 실패시킬 단계만 `failAt`으로 고른다 */
const stubFetch = (failAt: "presign" | "put" | "confirm" | null) => {
  const received: Received[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | string, init?: RequestInit) => {
      const request = typeof input === "string" ? null : input;
      const url = request?.url ?? (input as string);
      const method = request?.method ?? init?.method ?? "GET";
      const headers = request?.headers ?? new Headers(init?.headers);
      received.push({
        method,
        url,
        contentType: headers.get("content-type"),
        bodyIsArrayBuffer: init?.body instanceof ArrayBuffer,
      });
      const { pathname } = new URL(url);
      if (url === FILE_URI) return new Response(new Uint8Array([1, 2, 3]));
      if (pathname.endsWith("/presigned-url")) {
        return failAt === "presign"
          ? errorEnvelope(1413, "크기 초과", 400)
          : envelopeResponse({
              uploadUrl: S3_URL,
              s3Key: "key-1",
              expiresInSec: 60,
            });
      }
      if (url === S3_URL) {
        return new Response(failAt === "put" ? "<Error/>" : null, {
          status: failAt === "put" ? 403 : 200,
        });
      }
      return failAt === "confirm"
        ? errorEnvelope(1402, "S3에 없음", 400)
        : envelopeResponse(CONFIRMED);
    }),
  );
  return received;
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("프로필 이미지 업로드 mutation (기준 4·5)", () => {
  it("presign → S3 PUT → 확정 순서로 나가고 PUT의 Content-Type이 presign contentType과 같으며 바디가 ArrayBuffer다 (기준 5)", async () => {
    const { observer } = await loadUpload();
    const received = stubFetch(null);

    await observer.mutate(VARIABLES);

    expect(
      received.map((r) => `${r.method} ${new URL(r.url).pathname}`),
    ).toEqual([
      "POST /api/users/me/profile-image/presigned-url",
      // 파일 읽기는 S3 PUT 직전 — uploadFileToS3가 uri를 ArrayBuffer로 읽는다
      "GET /cache/photo.jpg",
      "PUT /bucket/key-1",
      "PUT /api/users/me/profile-image",
    ]);
    expect(received[2]).toMatchObject({
      contentType: "image/jpeg",
      bodyIsArrayBuffer: true,
    });
  });

  it("성공하면 getMe 봉투의 profileImageUrl만 확정 응답값으로 병합되고 나머지 필드는 보존된다 (기준 4)", async () => {
    const { observer, cachedMe } = await loadUpload();
    stubFetch(null);

    await observer.mutate(VARIABLES);

    expect(cachedMe()).toEqual({
      ...ME,
      profileImageUrl: "https://cdn/new.jpg",
    });
  });

  it.each([
    ["presign 4xx", "presign", 1],
    ["S3 PUT 비2xx", "put", 2],
    ["확정 4xx", "confirm", 3],
  ] as const)(
    "%s에 실패하면 getMe 캐시가 불변이고 후속 단계가 나가지 않으며 에러가 전파된다 (기준 4)",
    async (_label, failAt, apiCallsBeforeStop) => {
      const { observer, cachedMe } = await loadUpload();
      const received = stubFetch(failAt);

      await expect(observer.mutate(VARIABLES)).rejects.toThrow();

      // 파일 uri 읽기(GET)는 PUT 직전에 일어나므로 presign 실패 시 0회, 그 뒤로는 1회
      const apiCalls = received.filter((r) => r.url !== FILE_URI);
      expect(apiCalls).toHaveLength(apiCallsBeforeStop);
      expect(cachedMe()).toEqual(ME);
    },
  );
});
