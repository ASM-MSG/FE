import { describe, expect, it } from "vitest";
import { derivePermissionBanner } from "./permission-banner";

/**
 * 권한 배너 노출 파생 (MSG-409 AC 9·10, test-first) — 노출 정본은 408 토글 표시
 * 정본과 동일: checked=false(권한 미허용 또는 FCM 미등록)면 수신 불가 = 배너 (추정 3).
 */
describe("derivePermissionBanner — 배너 노출 파생 (AC 9·10)", () => {
  it("수신 가능 상태(checked=true)면 배너를 렌더하지 않는다 (AC 9)", () => {
    expect(
      derivePermissionBanner({ supported: true, checked: true }),
    ).toBeNull();
  });

  it("지원 브라우저에서 수신 불가(checked=false)면 CTA 배너다 (AC 9)", () => {
    expect(derivePermissionBanner({ supported: true, checked: false })).toBe(
      "cta",
    );
  });

  it("미지원 브라우저면 CTA 없는 안내 배너다 (AC 10)", () => {
    expect(derivePermissionBanner({ supported: false, checked: false })).toBe(
      "unsupported",
    );
  });
});
