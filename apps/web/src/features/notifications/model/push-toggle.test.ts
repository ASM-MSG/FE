import { describe, expect, it } from "vitest";
import { derivePushToggleState } from "./push-toggle";

describe("derivePushToggleState — 알림 받기 토글 표시 상태 파생 (AC 4·8)", () => {
  it("권한 granted && 보관 토큰 존재면 ON이다 (AC 4)", () => {
    expect(
      derivePushToggleState({
        supported: true,
        permission: "granted",
        hasStoredToken: true,
      }),
    ).toEqual({ supported: true, checked: true });
  });

  it("권한만 있고 보관 토큰이 없으면 OFF다 — 표시 정본 = granted && 보관 토큰 (AC 4)", () => {
    expect(
      derivePushToggleState({
        supported: true,
        permission: "granted",
        hasStoredToken: false,
      }),
    ).toEqual({ supported: true, checked: false });
  });

  it("보관 토큰이 있어도 권한이 granted가 아니면 OFF다 (AC 4)", () => {
    expect(
      derivePushToggleState({
        supported: true,
        permission: "denied",
        hasStoredToken: true,
      }),
    ).toEqual({ supported: true, checked: false });
  });

  it("미지원 브라우저면 비활성(supported=false)이고 항상 OFF다 (AC 8)", () => {
    expect(
      derivePushToggleState({
        supported: false,
        permission: null,
        hasStoredToken: true,
      }),
    ).toEqual({ supported: false, checked: false });
  });
});
