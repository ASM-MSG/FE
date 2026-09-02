import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import {
  isWithinSubmissionImageSize,
  MAX_SUBMISSION_IMAGE_BYTES,
  SUBMISSION_IMAGE_ACCEPT,
  submissionImageErrorMessage,
  SubmissionImageFormatError,
  SubmissionImageSizeError,
  toImagePresignParams,
} from "./submission-image";

describe("SUBMISSION_IMAGE_ACCEPT — 허용 형식 (AC 7)", () => {
  it("jpg·jpeg·png만 받고 webp는 받지 않는다 (AC 7 — 서버 계약)", () => {
    expect(SUBMISSION_IMAGE_ACCEPT).toBe("image/jpeg,image/png");
  });
});

describe("isWithinSubmissionImageSize — 10MB 상한 (AC 7)", () => {
  it("정확히 10MB는 허용된다 (경계)", () => {
    expect(isWithinSubmissionImageSize(MAX_SUBMISSION_IMAGE_BYTES)).toBe(true);
  });

  it("10MB를 1바이트 넘으면 거부된다 (경계 — AC 8)", () => {
    expect(isWithinSubmissionImageSize(MAX_SUBMISSION_IMAGE_BYTES + 1)).toBe(
      false,
    );
  });
});

describe("toImagePresignParams — presign 파라미터 도출 (AC 7)", () => {
  it("확장자를 점 없이 소문자로 넘기고 MIME·크기를 함께 싣는다 (AC 7)", () => {
    expect(
      toImagePresignParams({
        name: "cover.JPG",
        type: "image/jpeg",
        size: 1024,
      }),
    ).toEqual({
      extension: "jpg",
      contentType: "image/jpeg",
      contentLength: 1024,
    });
  });

  it("png도 확장자-MIME 쌍이 맞으면 도출된다 (AC 7)", () => {
    expect(
      toImagePresignParams({ name: "cover.png", type: "image/png", size: 10 })
        ?.extension,
    ).toBe("png");
  });

  it("허용 외 확장자(webp)는 도출하지 않는다 (AC 8)", () => {
    expect(
      toImagePresignParams({
        name: "cover.webp",
        type: "image/webp",
        size: 10,
      }),
    ).toBeNull();
  });

  it("확장자와 MIME 타입이 어긋나면 도출하지 않는다 (AC 8 — 서버 쌍 검증 선반영)", () => {
    expect(
      toImagePresignParams({ name: "cover.png", type: "image/jpeg", size: 10 }),
    ).toBeNull();
  });

  it("확장자가 없는 이름은 도출하지 않는다 (경계)", () => {
    expect(
      toImagePresignParams({ name: "cover", type: "image/jpeg", size: 10 }),
    ).toBeNull();
  });
});

describe("submissionImageErrorMessage — 실패 단계별 안내 (AC 8)", () => {
  it("형식 무효와 용량 초과는 각각 다른 문구로 안내된다 (AC 8)", () => {
    const format = submissionImageErrorMessage(
      new SubmissionImageFormatError(),
    );
    const size = submissionImageErrorMessage(new SubmissionImageSizeError());

    expect(format).toContain("JPG");
    expect(size).toContain("10MB");
    expect(format).not.toBe(size);
  });

  it("presign 실패(ApiError)와 S3 업로드 실패는 각각 다른 문구로 안내된다 (AC 8)", () => {
    const presign = submissionImageErrorMessage(
      new ApiError("발급 실패", { status: 500 }),
    );
    const put = submissionImageErrorMessage(new Error("S3 업로드 실패"));

    expect(presign).not.toBe(put);
    expect(put).toContain("업로드");
  });
});
