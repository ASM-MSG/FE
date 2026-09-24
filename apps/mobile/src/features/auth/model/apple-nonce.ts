/**
 * 애플 로그인 nonce (MSG-601 L2) — 순수 함수, 난수·해시는 주입.
 *
 * BE 계약 2항: 앱은 요청마다 nonce **원문**을 만들어 서버에 보내고, 애플 시트에는 그 SHA-256
 * 16진 **소문자**를 넘긴다(애플이 ID 토큰 `nonce` 클레임에 해시를 실어 주고, 서버가 원문을 해시해
 * 대조한다). 원문을 시트에 넘기거나 해시가 대문자면 서버가 항상 2421을 낸다(리스크 R3).
 * 실기에서는 `expo-crypto`가 주입되지만, 계약 자체는 여기서 Node `crypto`로 고정한다.
 */

interface NonceDeps {
  randomBytes: (byteLength: number) => Uint8Array;
  /** 16진 문자열을 돌려주는 SHA-256 — 대소문자는 여기서 정규화하므로 구현에 맡긴다 */
  sha256: (text: string) => Promise<string>;
}

const NONCE_BYTE_LENGTH = 32;

/** Hermes 안전 hex 변환 — `Buffer`·`toHex` 없이 바이트당 두 자리 */
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export const createAppleNonce = async ({
  randomBytes,
  sha256,
}: NonceDeps): Promise<{ raw: string; hashed: string }> => {
  const raw = toHex(randomBytes(NONCE_BYTE_LENGTH));
  const hashed = (await sha256(raw)).toLowerCase();
  return { raw, hashed };
};
