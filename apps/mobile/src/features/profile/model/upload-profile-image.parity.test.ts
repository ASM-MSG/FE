import { describe, expect, it, vi } from "vitest";
import type { ProfileImageCandidate } from "./profile-image";
import {
  uploadProfileImage,
  type ProfileImageUploadPorts,
} from "./upload-profile-image";

/**
 * 템플릿 ① 순수 로직 — 업로드 오케스트레이션이 웹 원본과 동등하다 (MSG-564 기준 3, parity).
 * 네트워크는 전부 포트로 주입되므로 같은 가짜 포트를 웹·모바일 모듈에 넣어 호출 순서·횟수·
 * 반환·실패 전파를 비교한다. 에러 클래스는 모듈이 다르면 참조도 다르므로(instanceof 경계)
 * `name`으로 비교한다 (profile-image.parity 선례).
 */
interface WebUploadProfileImageModule {
  uploadProfileImage: typeof uploadProfileImage;
}
const WEB_UPLOAD_PATH = new URL(
  "../../../../../web/src/features/profile/model/upload-profile-image.ts",
  import.meta.url,
).pathname;
const loadWebUploadProfileImage = (): Promise<WebUploadProfileImageModule> =>
  import(WEB_UPLOAD_PATH);

const CANDIDATE: ProfileImageCandidate = {
  name: "photo.JPG",
  type: "image/jpeg",
  size: 1024,
};
const CONFIRMED = {
  email: null,
  nickname: "필맵퍼",
  profileImageUrl: "https://cdn/new.jpg",
  createdAt: "2026-01-12T00:00:00",
  locationConsent: true,
  role: "USER" as const,
};

type Failure = "presign" | "put" | "confirm" | null;

/** 호출 로그를 남기는 가짜 포트 — `failAt` 단계에서 reject */
const fakePorts = (failAt: Failure) => {
  const calls: string[] = [];
  const ports: ProfileImageUploadPorts = {
    issuePresign: vi.fn(async (params) => {
      calls.push(`presign:${params.extension}:${params.contentType}`);
      if (failAt === "presign") throw new Error("presign 실패");
      return { uploadUrl: "https://s3/put", s3Key: "key-1", expiresInSec: 60 };
    }),
    putToS3: vi.fn(async ({ uploadUrl, contentType }) => {
      calls.push(`put:${uploadUrl}:${contentType}`);
      if (failAt === "put") throw new Error("put 실패");
    }),
    confirm: vi.fn(async (s3Key) => {
      calls.push(`confirm:${s3Key}`);
      if (failAt === "confirm") throw new Error("confirm 실패");
      return CONFIRMED;
    }),
  };
  return { ports, calls };
};

const run = async (
  impl: typeof uploadProfileImage,
  candidate: ProfileImageCandidate,
  failAt: Failure,
) => {
  const { ports, calls } = fakePorts(failAt);
  const outcome = await impl(candidate, ports).then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({
      ok: false as const,
      errorName: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : "",
    }),
  );
  return { outcome, calls };
};

describe("uploadProfileImage 오케스트레이션 (기준 3)", () => {
  it("presign → S3 PUT → 확정을 정확히 1회씩 순서대로 실행하고 확정 응답을 반환한다 (기준 3)", async () => {
    const { outcome, calls } = await run(uploadProfileImage, CANDIDATE, null);

    expect(calls).toEqual([
      "presign:jpg:image/jpeg",
      "put:https://s3/put:image/jpeg",
      "confirm:key-1",
    ]);
    expect(outcome).toEqual({ ok: true, value: CONFIRMED });
  });

  it.each([
    ["presign", ["presign:jpg:image/jpeg"]],
    ["put", ["presign:jpg:image/jpeg", "put:https://s3/put:image/jpeg"]],
  ] as const)(
    "%s 단계가 실패하면 후속 단계를 호출하지 않고 에러를 전파한다 (기준 3)",
    async (failAt, expectedCalls) => {
      const { outcome, calls } = await run(
        uploadProfileImage,
        CANDIDATE,
        failAt,
      );

      expect(calls).toEqual(expectedCalls);
      expect(outcome.ok).toBe(false);
    },
  );

  it("확장자 없는 후보는 어떤 포트도 부르지 않고 ProfileImageFormatError다 (기준 3)", async () => {
    const { outcome, calls } = await run(
      uploadProfileImage,
      { ...CANDIDATE, name: "photo" },
      null,
    );

    expect(calls).toEqual([]);
    expect(outcome).toMatchObject({
      ok: false,
      errorName: "ProfileImageFormatError",
    });
  });

  it("호출 순서·반환·실패 전파가 모든 표본에서 웹 원본과 동등하다 (기준 3, parity)", async () => {
    const web = await loadWebUploadProfileImage();
    const candidates = [CANDIDATE, { ...CANDIDATE, name: "photo" }];
    const failures: Failure[] = [null, "presign", "put", "confirm"];

    for (const candidate of candidates) {
      for (const failAt of failures) {
        const mobile = await run(uploadProfileImage, candidate, failAt);
        const original = await run(web.uploadProfileImage, candidate, failAt);

        expect(mobile.calls).toEqual(original.calls);
        expect(mobile.outcome).toEqual(original.outcome);
      }
    }
  });
});
