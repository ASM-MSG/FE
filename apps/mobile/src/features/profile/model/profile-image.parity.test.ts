import { describe, expect, it } from "vitest";
import { ApiError } from "../../../shared/api/api-error";
import {
  MAX_PROFILE_IMAGE_BYTES,
  PROFILE_IMAGE_ACCEPT,
  PROFILE_IMAGE_SIZE_MESSAGE,
  ProfileImageFormatError,
  isWithinProfileImageSize,
  mergeProfileImage,
  profileImageErrorMessage,
  toPresignParams,
} from "./profile-image";

/**
 * 템플릿 ① 순수 로직 — 프로필 이미지 순수 규칙이 웹 원본과 동등하다 (티켓 [참고] 포팅 지시).
 * 이번 티켓이 실제로 소비하는 것은 `profileImageErrorMessage`(삭제 실패 안내)지만, 티켓이
 * profile-image 전체 포팅을 지시하므로 7종 전부를 옮기고 parity로 고정한다 — 업로드 전용
 * 심볼(`PROFILE_IMAGE_ACCEPT`·`toPresignParams`·`isWithinProfileImageSize`)은 후속 이미지
 * 업로드 티켓의 진입점이다.
 * 에러 클래스는 모듈이 다르면 참조도 다르므로(instanceof 경계) 각 모듈의 인스턴스로 같은
 * 입력을 구성해 **관측 가능한 결과 문구**만 비교한다 (api-error.parity.test 선례).
 */
interface WebProfileImageModule {
  PROFILE_IMAGE_ACCEPT: string;
  MAX_PROFILE_IMAGE_BYTES: number;
  PROFILE_IMAGE_SIZE_MESSAGE: string;
  ProfileImageFormatError: new () => Error;
  isWithinProfileImageSize: typeof isWithinProfileImageSize;
  toPresignParams: typeof toPresignParams;
  profileImageErrorMessage: typeof profileImageErrorMessage;
  mergeProfileImage: typeof mergeProfileImage;
}
interface WebApiErrorModule {
  ApiError: new (
    message: string,
    init: { status?: number; developCode?: number },
  ) => Error;
}
const webPath = (rel: string) =>
  new URL(`../../../../../web/src/${rel}`, import.meta.url).pathname;
const loadWebProfileImage = (): Promise<WebProfileImageModule> =>
  import(webPath("features/profile/model/profile-image.ts"));
const loadWebApiError = (): Promise<WebApiErrorModule> =>
  import(webPath("shared/api/api-error.ts"));

const candidates = [
  { name: "photo.JPG", type: "image/jpeg", size: 1024 },
  { name: "photo.jpeg", type: "image/jpeg", size: 1024 },
  { name: "노을.PNG", type: "image/png", size: 1024 },
  { name: "photo", type: "image/png", size: 1024 },
  { name: "photo.", type: "image/png", size: 1024 },
  { name: ".gitignore", type: "text/plain", size: 1 },
];

/** developCode 분기 전부 + 비 ApiError 경로 */
const errorCodes = [1415, 1413, 1401, 1402, 1499];

describe("profile-image 상수·검증 동등성 (포팅 parity)", () => {
  it("accept·최대 용량 상수가 웹과 같다", async () => {
    const web = await loadWebProfileImage();

    expect(PROFILE_IMAGE_ACCEPT).toBe(web.PROFILE_IMAGE_ACCEPT);
    expect(MAX_PROFILE_IMAGE_BYTES).toBe(web.MAX_PROFILE_IMAGE_BYTES);
    expect(PROFILE_IMAGE_SIZE_MESSAGE).toBe(web.PROFILE_IMAGE_SIZE_MESSAGE);
  });

  it("5MB 경계는 포함하고 초과는 거른다 — 웹과 동등", async () => {
    const web = await loadWebProfileImage();
    const sizes = [
      0,
      1,
      MAX_PROFILE_IMAGE_BYTES - 1,
      MAX_PROFILE_IMAGE_BYTES,
      MAX_PROFILE_IMAGE_BYTES + 1,
    ];

    expect(isWithinProfileImageSize(MAX_PROFILE_IMAGE_BYTES)).toBe(true);
    expect(isWithinProfileImageSize(MAX_PROFILE_IMAGE_BYTES + 1)).toBe(false);
    for (const size of sizes) {
      expect(isWithinProfileImageSize(size)).toBe(
        web.isWithinProfileImageSize(size),
      );
    }
  });

  it("presign 파라미터 도출이 웹과 동등하다 — 확장자 소문자 정규화·확장자 없음은 null", async () => {
    const web = await loadWebProfileImage();

    expect(toPresignParams(candidates[0])).toEqual({
      extension: "jpg",
      contentType: "image/jpeg",
      contentLength: 1024,
    });
    expect(toPresignParams(candidates[3])).toBeNull();
    for (const candidate of candidates) {
      expect(toPresignParams(candidate)).toEqual(
        web.toPresignParams(candidate),
      );
    }
  });
});

describe("profile-image 오류 문구 동등성 (포팅 parity)", () => {
  it("클라이언트 형식 무효는 형식 안내 문구로 매핑된다 — 웹과 동등", async () => {
    const web = await loadWebProfileImage();

    expect(profileImageErrorMessage(new ProfileImageFormatError())).toBe(
      web.profileImageErrorMessage(new web.ProfileImageFormatError()),
    );
  });

  it("developCode별 안내 문구가 웹과 동등하다 (1415 형식 · 1413 크기 · 1401/1402 확정 실패 · 그 외 일반)", async () => {
    const web = await loadWebProfileImage();
    const webApiError = await loadWebApiError();

    for (const developCode of errorCodes) {
      expect(
        profileImageErrorMessage(
          new ApiError("실패", { status: 400, developCode }),
        ),
      ).toBe(
        web.profileImageErrorMessage(
          new webApiError.ApiError("실패", { status: 400, developCode }),
        ),
      );
    }
  });

  it("ApiError가 아닌 예외(네트워크·S3 실패)는 일반 실패 문구다 — 웹과 동등", async () => {
    const web = await loadWebProfileImage();
    const raw = new TypeError("Network request failed");

    expect(profileImageErrorMessage(raw)).toBe(
      web.profileImageErrorMessage(raw),
    );
  });
});

describe("mergeProfileImage — 확정 응답 병합 (포팅 parity)", () => {
  it("profileImageUrl만 반영하고 나머지 필드는 기존 값을 유지한다 — 웹과 동등", async () => {
    const web = await loadWebProfileImage();
    const prev = {
      email: "fillmapper@fillmap.app",
      nickname: "필맵퍼",
      profileImageUrl: null,
      createdAt: "2026-01-12T00:00:00",
      locationConsent: true,
    };
    const confirmed = {
      ...prev,
      nickname: "덮어쓰면 안 됨",
      profileImageUrl: "https://cdn/a.jpg",
    };

    expect(mergeProfileImage(prev, confirmed)).toEqual(
      web.mergeProfileImage(prev, confirmed),
    );
    expect(mergeProfileImage(prev, confirmed)).toEqual({
      ...prev,
      profileImageUrl: "https://cdn/a.jpg",
    });
  });
});
