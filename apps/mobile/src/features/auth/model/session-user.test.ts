import { describe, expect, it } from "vitest";
import { userIdFromAccessToken } from "./session-user";

const token = (payload: unknown) =>
  `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.s`;

/** MSG-606 — 소유 판정 재료: JWT sub → 사용자 id */
describe("userIdFromAccessToken", () => {
  it("sub(문자열·숫자)를 양의 정수 id로 읽는다", () => {
    expect(userIdFromAccessToken(token({ sub: "42", role: "USER" }))).toBe(42);
    expect(userIdFromAccessToken(token({ sub: 7 }))).toBe(7);
  });

  it("토큰 없음·형식 밖·sub 없음·비정수는 null", () => {
    expect(userIdFromAccessToken(null)).toBeNull();
    expect(userIdFromAccessToken("not-a-jwt")).toBeNull();
    expect(userIdFromAccessToken("a.b")).toBeNull();
    expect(userIdFromAccessToken(token({ role: "USER" }))).toBeNull();
    expect(userIdFromAccessToken(token({ sub: "abc" }))).toBeNull();
    expect(userIdFromAccessToken(token({ sub: "0" }))).toBeNull();
    expect(userIdFromAccessToken("h.%%%.s")).toBeNull();
  });
});
