import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadToS3 } from "./s3-upload";

/**
 * S3 직접 PUT 어댑터 (B10) — presigned URL 업로드는 앱 httpClient(ky)를 타지 않고
 * 전역 fetch로 수행된다. Authorization·X-Device-Id 등 앱 헤더·쿠키가 외부 S3 도메인으로
 * 새지 않아야 한다 (선분석·확정 공통).
 */
afterEach(() => {
  vi.unstubAllGlobals();
});

const stubFetch = (response: Response) => {
  const calls: { input: RequestInfo | URL; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return response;
    }),
  );
  return calls;
};

describe("uploadToS3 — 전역 fetch PUT (B10)", () => {
  it("presigned URL로 PUT하고 파일을 바디로 싣는다", async () => {
    const calls = stubFetch(new Response(null, { status: 200 }));
    const file = new File(["v"], "clip.mp4", { type: "video/mp4" });

    await uploadToS3("https://bucket.s3.example.com/key?sig=abc", file);

    expect(calls).toHaveLength(1);
    expect(String(calls[0].input)).toBe(
      "https://bucket.s3.example.com/key?sig=abc",
    );
    expect(calls[0].init?.method).toBe("PUT");
    expect(calls[0].init?.body).toBe(file);
  });

  it("요청에 Authorization·X-Device-Id 헤더가 없다 — 앱 httpClient 미경유 (B10)", async () => {
    const calls = stubFetch(new Response(null, { status: 200 }));

    await uploadToS3(
      "https://bucket.s3.example.com/key",
      new File(["v"], "clip.mp4", { type: "video/mp4" }),
    );

    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("X-Device-Id")).toBeNull();
  });

  it("Content-Type은 파일 MIME 타입으로 싣는다 — presign 발급 시 서명된 타입과 일치해야 한다", async () => {
    const calls = stubFetch(new Response(null, { status: 200 }));

    await uploadToS3(
      "https://bucket.s3.example.com/key",
      new File(["v"], "clip.mov", { type: "video/quicktime" }),
    );

    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get("Content-Type")).toBe("video/quicktime");
  });

  it("S3가 실패 응답이면 에러를 던진다 — 단계 실패로 구분 표시된다 (B11)", async () => {
    stubFetch(new Response(null, { status: 403 }));

    await expect(
      uploadToS3(
        "https://bucket.s3.example.com/key",
        new File(["v"], "clip.mp4", { type: "video/mp4" }),
      ),
    ).rejects.toThrow(/403/);
  });
});
