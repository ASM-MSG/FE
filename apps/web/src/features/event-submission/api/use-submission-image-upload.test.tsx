import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/api-error";
import { envelopeResponse } from "@/test/envelope-response";
import { queryWrapper } from "@/test/query-wrapper";
import {
  MAX_SUBMISSION_IMAGE_BYTES,
  SubmissionImageFormatError,
  SubmissionImageSizeError,
} from "../model/submission-image";
import { useSubmissionImageUpload } from "./use-submission-image-upload";

const PRESIGN_PATH = "/api/org/event-submissions/image/presigned-url";
const UPLOAD_URL = "https://s3.fillmap.test/pending/submissions/abc.jpg?sig=1";

const imageFile = (
  name = "cover.jpg",
  type = "image/jpeg",
  size?: number,
): File => {
  const file = new File(["binary"], name, { type });
  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size });
  }
  return file;
};

interface FetchCall {
  url: string;
  method: string;
}

/**
 * presign(앱 API — ky가 Request 객체로 부른다)과 S3 직접 PUT(uploadToS3가 url+init로
 * 부른다)을 함께 받는 네트워크 경계 스텁. 두 호출 형태가 섞여 공용 `stubFetch`(Request
 * 전용)를 쓸 수 없다.
 */
const uploadFetch = ({
  presignStatus = 200,
  putStatus = 200,
}: { presignStatus?: number; putStatus?: number } = {}): FetchCall[] => {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    async (input: Request | string, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.url;
      const method =
        (typeof input === "string" ? init?.method : input.method) ?? "GET";
      calls.push({ url, method });

      if (new URL(url).pathname === PRESIGN_PATH) {
        if (presignStatus !== 200) {
          return new Response("", { status: presignStatus });
        }
        return envelopeResponse({
          uploadUrl: UPLOAD_URL,
          s3Key: "pending/submissions/abc.jpg",
          expiresInSec: 300,
        });
      }
      return new Response("", { status: putStatus });
    },
  );
  return calls;
};

const renderUpload = () =>
  renderHook(() => useSubmissionImageUpload(), { wrapper: queryWrapper });

describe("useSubmissionImageUpload — presign → S3 PUT 오케스트레이션 (AC 7·8)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("검증을 통과한 파일은 presign 발급 후 S3에 PUT되고 s3Key를 돌려준다 (AC 7)", async () => {
    const calls = uploadFetch();
    const { result } = renderUpload();

    const s3Key = await result.current.mutateAsync(imageFile());

    expect(s3Key).toBe("pending/submissions/abc.jpg");
    const put = calls.find((call) => call.method === "PUT");
    expect(put?.url).toBe(UPLOAD_URL);
  });

  it("허용 외 형식은 presign을 발급하지 않고 형식 오류로 끝난다 (AC 8)", async () => {
    const calls = uploadFetch();
    const { result } = renderUpload();

    await expect(
      result.current.mutateAsync(imageFile("cover.webp", "image/webp")),
    ).rejects.toBeInstanceOf(SubmissionImageFormatError);
    expect(calls).toHaveLength(0);
  });

  it("10MB를 넘는 파일은 presign을 발급하지 않고 용량 오류로 끝난다 (AC 8)", async () => {
    const calls = uploadFetch();
    const { result } = renderUpload();

    await expect(
      result.current.mutateAsync(
        imageFile("cover.jpg", "image/jpeg", MAX_SUBMISSION_IMAGE_BYTES + 1),
      ),
    ).rejects.toBeInstanceOf(SubmissionImageSizeError);
    expect(calls).toHaveLength(0);
  });

  it("presign 발급이 실패하면 S3 PUT을 시도하지 않는다 (AC 8)", async () => {
    const calls = uploadFetch({ presignStatus: 500 });
    const { result } = renderUpload();

    await expect(
      result.current.mutateAsync(imageFile()),
    ).rejects.toBeInstanceOf(ApiError);
    expect(calls.some((call) => call.method === "PUT")).toBe(false);
  });

  it("S3 PUT이 실패하면 s3Key 없이 실패로 끝난다 (AC 8)", async () => {
    uploadFetch({ putStatus: 403 });
    const { result } = renderUpload();

    await expect(result.current.mutateAsync(imageFile())).rejects.toThrow();
  });
});
