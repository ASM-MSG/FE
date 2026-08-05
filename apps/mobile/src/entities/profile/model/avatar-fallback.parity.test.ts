import { describe, expect, it } from "vitest";
import { avatarFallback } from "./avatar-fallback";

/**
 * AC 2 로직 지원: 아바타 이니셜 폴백 — 닉네임 "필맵퍼" → "필".
 * 웹 avatar-fallback 원본과 동등 (parity — regions.parity 선례).
 */
interface WebAvatarFallbackModule {
  avatarFallback: typeof avatarFallback;
}
const WEB_AVATAR_FALLBACK_PATH = new URL(
  "../../../../../web/src/entities/profile/model/avatar-fallback.ts",
  import.meta.url,
).pathname;
const loadWebAvatarFallback = (): Promise<WebAvatarFallbackModule> =>
  import(WEB_AVATAR_FALLBACK_PATH);

describe("avatarFallback 동등성 (AC 2 로직)", () => {
  it("닉네임 첫 글자를 이니셜로 반환하고 웹 원본과 동일하다 — '필맵퍼' → '필', 빈 문자열 → 빈 문자열", async () => {
    const web = await loadWebAvatarFallback();
    const samples = ["필맵퍼", "F", ""];
    expect(avatarFallback("필맵퍼")).toBe("필");
    for (const nickname of samples) {
      expect(avatarFallback(nickname)).toBe(web.avatarFallback(nickname));
    }
  });
});
