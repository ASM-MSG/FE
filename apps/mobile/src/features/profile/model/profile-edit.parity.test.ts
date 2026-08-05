import { describe, expect, it } from "vitest";
import { canSaveProfile, locationStatusLabel } from "./profile-edit";

/**
 * AC 15·16: 프로필 편집 폼 로직 — 웹 profile-edit 원본과 동등 (parity).
 * 꺼짐 문구 "사용 안 함"은 승인된 추정 3, 공백 닉네임 저장 불가는 승인된 추정 4.
 */
interface WebProfileEditModule {
  canSaveProfile: typeof canSaveProfile;
  locationStatusLabel: typeof locationStatusLabel;
}
const WEB_PROFILE_EDIT_PATH = new URL(
  "../../../../../web/src/features/profile/model/profile-edit.ts",
  import.meta.url,
).pathname;
const loadWebProfileEdit = (): Promise<WebProfileEditModule> =>
  import(WEB_PROFILE_EDIT_PATH);

describe("profile-edit 동등성 (AC 15·16)", () => {
  it("위치정보 토글 문구가 켜짐 '사용 중'/꺼짐 '사용 안 함'이고 웹 locationStatusLabel과 동등하다 (AC 15, 추정 3)", async () => {
    const web = await loadWebProfileEdit();
    expect(locationStatusLabel(true)).toBe("사용 중");
    expect(locationStatusLabel(false)).toBe("사용 안 함");
    for (const enabled of [true, false]) {
      expect(locationStatusLabel(enabled)).toBe(
        web.locationStatusLabel(enabled),
      );
    }
  });

  it("닉네임이 공백뿐이면 저장 불가이고 웹 canSaveProfile과 동등하다 (AC 16, 추정 4)", async () => {
    const web = await loadWebProfileEdit();
    const samples = ["", "   ", "\t\n", "필맵퍼", " 필맵퍼 "];
    expect(canSaveProfile("")).toBe(false);
    expect(canSaveProfile("   ")).toBe(false);
    expect(canSaveProfile("필맵퍼")).toBe(true);
    for (const nickname of samples) {
      expect(canSaveProfile(nickname)).toBe(web.canSaveProfile(nickname));
    }
  });
});
