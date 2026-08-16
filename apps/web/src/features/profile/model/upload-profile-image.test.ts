import { describe, expect, it, vi } from "vitest";
import type { UserProfileResponseDto } from "@/shared/api/generated";
import { ProfileImageFormatError } from "./profile-image";
import {
  uploadProfileImage,
  type ProfileImageUploadPorts,
} from "./upload-profile-image";

const CANDIDATE = { name: "pic.png", type: "image/png", size: 100 };

const PRESIGN_RES = {
  uploadUrl: "https://s3.fillmap.kr/profile/pending/1.png?sig=abc",
  s3Key: "profile/pending/1.png",
  expiresInSec: 600,
};

const CONFIRMED: UserProfileResponseDto = {
  email: "fillmapper@fillmap.app",
  nickname: "필맵퍼",
  profileImageUrl: "https://cdn.fillmap.kr/profile/1.png",
  createdAt: "2026-08-11T09:00:00",
  locationConsent: false,
};

const makePorts = (
  overrides: Partial<ProfileImageUploadPorts> = {},
): ProfileImageUploadPorts => ({
  issuePresign: vi.fn(async () => PRESIGN_RES),
  putToS3: vi.fn(async () => undefined),
  confirm: vi.fn(async () => CONFIRMED),
  ...overrides,
});

// 기준 4: presign → S3 PUT → 확정 순서로 정확히 1회씩, 확정 응답 반환
describe("uploadProfileImage — 포트 주입 오케스트레이션 (기준 4)", () => {
  it("presign → S3 PUT → 확정을 정확히 1회씩 순서대로 호출하고 확정 응답을 반환한다", async () => {
    const ports = makePorts();

    const result = await uploadProfileImage(CANDIDATE, ports);

    expect(result).toBe(CONFIRMED);
    expect(ports.issuePresign).toHaveBeenCalledTimes(1);
    expect(ports.putToS3).toHaveBeenCalledTimes(1);
    expect(ports.confirm).toHaveBeenCalledTimes(1);
    // 호출 순서: presign < PUT < 확정
    const orderOf = (fn: unknown) =>
      (fn as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(orderOf(ports.issuePresign)).toBeLessThan(orderOf(ports.putToS3));
    expect(orderOf(ports.putToS3)).toBeLessThan(orderOf(ports.confirm));
  });

  it("presign에는 후보에서 도출한 파라미터가, 확정에는 presign 응답의 s3Key가 전달된다", async () => {
    const ports = makePorts();

    await uploadProfileImage(CANDIDATE, ports);

    expect(ports.issuePresign).toHaveBeenCalledWith({
      extension: "png",
      contentType: "image/png",
      contentLength: 100,
    });
    expect(ports.confirm).toHaveBeenCalledWith(PRESIGN_RES.s3Key);
  });

  it("S3 PUT에는 presign 응답의 uploadUrl과 presign 요청과 동일한 contentType이 전달된다", async () => {
    const ports = makePorts();

    await uploadProfileImage(CANDIDATE, ports);

    expect(ports.putToS3).toHaveBeenCalledWith({
      uploadUrl: PRESIGN_RES.uploadUrl,
      contentType: "image/png",
    });
  });
});

// 기준 5: 각 단계 실패 시 후속 단계 미호출 + 에러 전파
describe("uploadProfileImage — 단계별 실패 전파 (기준 5)", () => {
  it("presign 실패 시 S3 PUT·확정이 호출되지 않고 에러가 전파된다", async () => {
    const error = new Error("presign 거부");
    const ports = makePorts({
      issuePresign: vi.fn(async () => Promise.reject(error)),
    });

    await expect(uploadProfileImage(CANDIDATE, ports)).rejects.toBe(error);
    expect(ports.putToS3).not.toHaveBeenCalled();
    expect(ports.confirm).not.toHaveBeenCalled();
  });

  it("S3 PUT 실패 시 확정이 호출되지 않고 에러가 전파된다", async () => {
    const error = new Error("S3 403");
    const ports = makePorts({
      putToS3: vi.fn(async () => Promise.reject(error)),
    });

    await expect(uploadProfileImage(CANDIDATE, ports)).rejects.toBe(error);
    expect(ports.issuePresign).toHaveBeenCalledTimes(1);
    expect(ports.confirm).not.toHaveBeenCalled();
  });

  it("확정 실패 시 에러가 전파된다", async () => {
    const error = new Error("확정 1402");
    const ports = makePorts({
      confirm: vi.fn(async () => Promise.reject(error)),
    });

    await expect(uploadProfileImage(CANDIDATE, ports)).rejects.toBe(error);
  });

  it("확장자 없는 후보는 어떤 포트도 호출하지 않고 형식 무효 에러를 던진다 — 추정 2", async () => {
    const ports = makePorts();

    await expect(
      uploadProfileImage({ name: "photo", type: "image/png", size: 10 }, ports),
    ).rejects.toBeInstanceOf(ProfileImageFormatError);
    expect(ports.issuePresign).not.toHaveBeenCalled();
    expect(ports.putToS3).not.toHaveBeenCalled();
    expect(ports.confirm).not.toHaveBeenCalled();
  });
});
