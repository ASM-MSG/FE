import { describe, expect, it } from "vitest";
import { toPermissionState } from "./permission-state";

/**
 * 템플릿 ① 순수 로직 — OS 런타임 권한 3상태 매핑 (MSG-447 기준 3·8).
 * 위치(expo-location)·알림(expo-notifications)이 똑같은 `{granted, canAskAgain}` 쌍을
 * 돌려주므로 매핑을 한 벌만 둔다(결정 D2). `denied`가 곧 안드로이드 "다시 묻지 않음"이라
 * 복구 CTA가 [권한 요청]이 아니라 [설정 열기]로 갈리는 분기점이다.
 */
describe("toPermissionState — 네이티브 권한 응답 → 3상태 (기준 3)", () => {
  it("허용됐으면 granted다", () => {
    expect(toPermissionState({ granted: true, canAskAgain: false })).toBe(
      "granted",
    );
  });

  it("아직 허용되지 않았지만 다시 물을 수 있으면 undetermined다 — 재요청 경로가 살아 있다", () => {
    expect(toPermissionState({ granted: false, canAskAgain: true })).toBe(
      "undetermined",
    );
  });

  it("다시 물을 수 없으면 denied다 — 안드로이드 '다시 묻지 않음' 영구 거부 (기준 3)", () => {
    expect(toPermissionState({ granted: false, canAskAgain: false })).toBe(
      "denied",
    );
  });

  it("canAskAgain이 누락된 응답은 denied로 본다 — 되물을 수 있다고 낙관하면 눌러도 아무 일이 없는 CTA가 된다", () => {
    expect(toPermissionState({ granted: false, canAskAgain: undefined })).toBe(
      "denied",
    );
  });
});
