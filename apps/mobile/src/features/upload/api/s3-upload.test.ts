import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadFileToS3 } from "./s3-upload";

/**
 * 기준 24: S3 presigned PUT은 앱 httpClient(ky)를 **경유하지 않는다** —
 * Authorization·X-Client-Type 등 앱 헤더가 외부 S3 도메인으로 새는 것을 막는 웹 B10 원칙.
 * RN에는 `File`이 없어 파일 uri를 먼저 읽은 뒤 같은 PUT을 보낸다.
 *
 * 재작업(검증 실패 1): 이 스텁은 **Expo winter fetch의 body 정규화 규칙을 재현한다.**
 * 앱의 `globalThis.fetch`는 RN의 whatwg-fetch가 아니라 Expo가 갈아 끼운 native fetch이고
 * (`expo/src/winter/runtime.native.ts`의 `install('fetch', …)`),
 * `normalizeBodyInitAsync`가 body를 Blob으로 보면
 * `overriddenHeaders: [["Content-Type", body.type]]`을 돌려주며 `overrideHeaders`가
 * **호출자의 Content-Type을 지우고** 그 값으로 갈아 끼운다
 * (`expo/src/winter/fetch/RequestUtils.ts`). Blob이 아닌 바이트 바디에는 그 override가 없다.
 * 초기 구현이 Blob을 실어 보내 presign 서명 타입이 유실됐고, S3가 100% 403
 * `SignatureDoesNotMatch`로 거절했다 — 아래 "실효 Content-Type" 테스트가 그 결함을 고정한다.
 */
afterEach(() => {
  vi.unstubAllGlobals();
});

interface FetchCall {
  input: RequestInfo | URL;
  init?: RequestInit;
}

/** file uri 읽기 응답, 그 외(S3 PUT)는 지정 응답으로 답하는 전역 fetch 스텁 */
const stubFetch = (putResponse: Response) => {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      if (init?.method === "PUT") return putResponse;
      // 로컬 파일 읽기 응답에는 content-type이 없다 — 실기 관측과 동일(그래서
      // .blob()의 type이 빈 문자열이 되고, Blob body일 때 서명 타입이 지워졌다)
      return new Response(new Blob(["video-bytes"]), { status: 200 });
    }),
  );
  return calls;
};

/**
 * 실제로 회선에 나가는 Content-Type — Expo fetch의 override 규칙을 적용한 값.
 * 호출자가 헤더에 무엇을 넣었는지가 아니라 **S3가 서명 검증에 쓰는 값**을 본다.
 */
const effectiveContentType = (init?: RequestInit): string | null => {
  const body = init?.body;
  if (body instanceof Blob) return body.type;
  return new Headers(init?.headers).get("Content-Type");
};

describe("uploadFileToS3 — 전역 fetch PUT (기준 24)", () => {
  it("파일 uri를 읽어 presigned URL로 PUT한다 (기준 24)", async () => {
    const calls = stubFetch(new Response(null, { status: 200 }));

    await uploadFileToS3(
      "https://bucket.s3.example.com/key?sig=abc",
      "file:///clip.mp4",
      "video/mp4",
    );

    expect(String(calls[0].input)).toBe("file:///clip.mp4");
    expect(String(calls[1].input)).toBe(
      "https://bucket.s3.example.com/key?sig=abc",
    );
    expect(calls[1].init?.method).toBe("PUT");
  });

  it("요청에 Authorization·X-Client-Type 헤더가 없다 — 앱 httpClient 미경유 (기준 24)", async () => {
    const calls = stubFetch(new Response(null, { status: 200 }));

    await uploadFileToS3(
      "https://bucket.s3.example.com/key",
      "file:///clip.mp4",
      "video/mp4",
    );

    const headers = new Headers(calls[1].init?.headers);
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.get("X-Client-Type")).toBeNull();
  });

  it("실제로 나가는 Content-Type이 presign 서명 타입 그대로다 — Blob body는 Expo fetch가 이 헤더를 덮어써 403 SignatureDoesNotMatch를 만든다 (기준 24)", async () => {
    const calls = stubFetch(new Response(null, { status: 200 }));

    await uploadFileToS3(
      "https://bucket.s3.example.com/key",
      "file:///clip.mov",
      "video/quicktime",
    );

    expect(effectiveContentType(calls[1].init)).toBe("video/quicktime");
  });

  it("파일 바이트를 그대로 싣는다 — 서명된 content-length와 어긋나지 않아야 한다 (기준 24)", async () => {
    const calls = stubFetch(new Response(null, { status: 200 }));

    await uploadFileToS3(
      "https://bucket.s3.example.com/key",
      "file:///clip.mp4",
      "video/mp4",
    );

    const body = calls[1].init?.body;
    expect(body).toBeInstanceOf(ArrayBuffer);
    expect((body as ArrayBuffer).byteLength).toBe(
      new TextEncoder().encode("video-bytes").byteLength,
    );
  });

  it("S3가 실패 응답이면 상태코드와 응답 본문을 담은 에러를 던진다 — 서명 실패 원인이 로그에 남아야 한다 (기준 23·34)", async () => {
    stubFetch(
      new Response(
        "<Error><Code>SignatureDoesNotMatch</Code><Message>...</Message></Error>",
        { status: 403 },
      ),
    );

    await expect(
      uploadFileToS3(
        "https://bucket.s3.example.com/key",
        "file:///clip.mp4",
        "video/mp4",
      ),
    ).rejects.toThrow(/403.*SignatureDoesNotMatch/s);
  });
});
