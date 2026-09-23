import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import { createAppleNonce } from "./apple-nonce";

/**
 * 템플릿 ① 순수 로직 — 애플 로그인 nonce (MSG-601 L2).
 * BE 계약 2항: 앱은 nonce **원문**을 서버에 보내고, 그 SHA-256 16진 **소문자**를 애플 시트에
 * 넘긴다. 원문을 시트에 넘기거나 해시가 대문자면 서버 대조가 항상 실패한다(2421 — 리스크 R3).
 * 난수·해시는 주입이라 Node `crypto` 실구현으로 계약을 그대로 단정한다.
 */
const nodeSha256 = async (text: string) =>
  createHash("sha256").update(text).digest("hex");

describe("createAppleNonce (L2)", () => {
  it("32바이트 난수의 소문자 hex 64자를 원문(raw)으로, 그 SHA-256 소문자 hex를 hashed로 돌려준다", async () => {
    const { raw, hashed } = await createAppleNonce({
      randomBytes: (n) => new Uint8Array(randomBytes(n)),
      sha256: nodeSha256,
    });

    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    expect(hashed).toBe(await nodeSha256(raw));
  });

  it("주입된 난수 32바이트를 그대로 hex로 옮긴다 — 바이트 하나가 두 자리(0 패딩)", async () => {
    const bytes = new Uint8Array(32);
    bytes[0] = 0x00;
    bytes[1] = 0x0a;
    bytes[31] = 0xff;

    const { raw } = await createAppleNonce({
      randomBytes: (n) => bytes.subarray(0, n),
      sha256: nodeSha256,
    });

    expect(raw.startsWith("000a")).toBe(true);
    expect(raw.endsWith("ff")).toBe(true);
    expect(raw).toHaveLength(64);
  });

  it("해시 구현이 대문자 hex를 돌려줘도 hashed는 소문자로 정규화된다 (R3)", async () => {
    const { raw, hashed } = await createAppleNonce({
      randomBytes: (n) => new Uint8Array(randomBytes(n)),
      sha256: async (text) => (await nodeSha256(text)).toUpperCase(),
    });

    expect(hashed).toBe(await nodeSha256(raw));
  });
});
