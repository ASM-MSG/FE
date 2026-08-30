import { describe, expect, it } from "vitest";
import type { UserProfileResponseDto } from "@/shared/api/generated";
import { ApiError } from "@/shared/api/api-error";
import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_ACCEPT,
  ProfileImageFormatError,
  isWithinProfileImageSize,
  mergeProfileImage,
  profileImageErrorMessage,
  toPresignParams,
} from "./profile-image";

// 기준 1: accept 상수는 jpg·jpeg·png·webp만 포함하고 heic를 포함하지 않는다
describe("PROFILE_IMAGE_ACCEPT — 허용 이미지 형식 (기준 1)", () => {
  it("jpeg·png·webp MIME 타입만 포함한다 (jpg·jpeg는 image/jpeg로 커버 — 추정 1)", () => {
    expect(PROFILE_IMAGE_ACCEPT.split(",").sort()).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("heic·heif를 포함하지 않는다 — iOS가 플랫폼 수준에서 JPEG로 변환하게 유도", () => {
    expect(PROFILE_IMAGE_ACCEPT).not.toMatch(/hei[cf]/i);
  });
});

// 기준 2: 5MB 이하 통과, 초과 거부 — 경계값 5MB 정확히는 통과
describe("isWithinProfileImageSize — 5MB 크기 검증 (기준 2)", () => {
  it("상한 상수는 5MB(5·1024·1024 바이트)다", () => {
    expect(MAX_PROFILE_IMAGE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("5MB 정확히(경계값)와 그 이하는 통과한다", () => {
    expect(isWithinProfileImageSize(MAX_PROFILE_IMAGE_BYTES)).toBe(true);
    expect(isWithinProfileImageSize(1)).toBe(true);
  });

  it("5MB 초과는 거부한다", () => {
    expect(isWithinProfileImageSize(MAX_PROFILE_IMAGE_BYTES + 1)).toBe(false);
  });
});

// 기준 3: 중립 형태 {name, type, size} → {extension, contentType, contentLength}
describe("toPresignParams — presign 요청 파라미터 도출 (기준 3)", () => {
  it("파일 이름·MIME 타입·크기에서 presign 파라미터를 만든다", () => {
    expect(
      toPresignParams({ name: "photo.png", type: "image/png", size: 1234 }),
    ).toEqual({
      extension: "png",
      contentType: "image/png",
      contentLength: 1234,
    });
  });

  it("확장자는 소문자로 정규화한다", () => {
    expect(
      toPresignParams({ name: "Photo.JPG", type: "image/jpeg", size: 10 }),
    ).toEqual({
      extension: "jpg",
      contentType: "image/jpeg",
      contentLength: 10,
    });
  });

  it("확장자 없는 이름은 무효(null) 판정한다 — 점 없음·점만 있고 빈 확장자 둘 다", () => {
    expect(
      toPresignParams({ name: "photo", type: "image/png", size: 10 }),
    ).toBeNull();
    expect(
      toPresignParams({ name: "photo.", type: "image/png", size: 10 }),
    ).toBeNull();
  });
});

// 기준 6: developCode 1415·1413·1401·1402 각각과 그 외 → 비어 있지 않은 한국어 안내 문구
describe("profileImageErrorMessage — 에러 → 안내 문구 매핑 (기준 6)", () => {
  const messageFor = (developCode: number) =>
    profileImageErrorMessage(
      new ApiError("서버 메시지", { status: 400, developCode }),
    );

  it.each([1415, 1413, 1401, 1402])(
    "developCode %i에 비어 있지 않은 한국어 문구를 돌려준다",
    (code) => {
      const message = messageFor(code);
      expect(message.length).toBeGreaterThan(0);
      expect(message).toMatch(/[가-힣]/);
    },
  );

  it("1415(형식)는 허용 형식을, 1413(크기)은 5MB 상한을 안내한다", () => {
    expect(messageFor(1415)).toContain("형식");
    expect(messageFor(1413)).toContain("5MB");
  });

  it("그 외(네트워크·S3 실패 포함)는 일반 실패 문구를 돌려주고, 도메인 코드 문구와 구분된다", () => {
    const fallback = profileImageErrorMessage(new Error("S3 PUT failed"));
    expect(fallback.length).toBeGreaterThan(0);
    expect(fallback).toMatch(/[가-힣]/);
    expect(messageFor(1415)).not.toBe(fallback);
    expect(messageFor(1413)).not.toBe(fallback);
  });

  it("미지의 developCode(ApiError)도 일반 실패 문구로 처리한다", () => {
    expect(messageFor(9999)).toBe(
      profileImageErrorMessage(new Error("network")),
    );
  });

  it("형식 무효 판정 에러(ProfileImageFormatError)는 1415와 같은 형식 안내 문구다 — 추정 2", () => {
    expect(profileImageErrorMessage(new ProfileImageFormatError())).toBe(
      messageFor(1415),
    );
  });
});

// 기준 7: 확정 응답 + 기존 getMe 캐시(봉투 data) → profileImageUrl만 갱신 (추정 4).
// MSG-329 병합으로 캐시 원본이 ProfileData가 아니라 명세 DTO가 됐다 — 계약도 DTO 기준
describe("mergeProfileImage — 캐시 병합 (기준 7)", () => {
  const prev: UserProfileResponseDto = {
    nickname: "필맵퍼",
    email: "fillmapper@fillmap.app",
    profileImageUrl: null,
    createdAt: "2026-01-12T09:00:00",
    locationConsent: false,
    role: "USER",
  };
  const confirmed: UserProfileResponseDto = {
    email: "server-account@kakao.com",
    nickname: "서버닉네임",
    profileImageUrl: "https://cdn.fillmap.kr/profile/42.png",
    createdAt: "2026-08-11T09:00:00",
    locationConsent: false,
    role: "USER",
  };

  it("profileImageUrl만 확정 응답 값으로 갱신된 새 객체를 만든다", () => {
    const merged = mergeProfileImage(prev, confirmed);
    expect(merged.profileImageUrl).toBe(
      "https://cdn.fillmap.kr/profile/42.png",
    );
    expect(merged).not.toBe(prev);
    expect(prev.profileImageUrl).toBeNull(); // 원본 불변
  });

  it("기존 캐시의 email·nickname·createdAt은 유지한다 — 화면이 두 사용자를 말하지 않게 (추정 4)", () => {
    const merged = mergeProfileImage(prev, confirmed);
    expect(merged.email).toBe(prev.email);
    expect(merged.nickname).toBe(prev.nickname);
    expect(merged.createdAt).toBe(prev.createdAt);
  });
});
