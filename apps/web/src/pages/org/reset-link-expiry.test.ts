import { describe, expect, it } from "vitest";
import { resetLinkExpiry } from "./reset-link-expiry";

describe("resetLinkExpiry — 발송 완료 화면의 보낸 시각·유효 기간 (AC 10·추정 6)", () => {
  it("제출 시각을 'YYYY. M. D. HH:MM'으로 표기한다 (AC 10)", () => {
    expect(resetLinkExpiry(new Date(2026, 8, 18, 10, 24)).sentAtLabel).toBe(
      "2026. 9. 18. 10:24",
    );
  });

  it("유효 기간은 제출 시각 +30분이다 (AC 10)", () => {
    expect(resetLinkExpiry(new Date(2026, 8, 18, 10, 24)).expiresAtLabel).toBe(
      "10:54",
    );
  });

  it("30분을 더해 시가 넘어가면 다음 시로 이어진다 — 경계 (AC 10)", () => {
    expect(resetLinkExpiry(new Date(2026, 8, 18, 23, 40)).expiresAtLabel).toBe(
      "00:10",
    );
  });
});
