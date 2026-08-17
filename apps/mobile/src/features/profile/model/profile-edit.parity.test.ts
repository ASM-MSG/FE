import { describe, expect, it } from "vitest";
import { canSaveProfile, locationStatusLabel } from "./profile-edit";

/**
 * AC 15·16: 프로필 편집 폼 로직 — 웹 profile-edit 원본과 동등 (parity).
 * 꺼짐 문구 "사용 안 함"은 승인된 추정 3, 공백 닉네임 저장 불가는 승인된 추정 4.
 * [MSG-407 v3] 웹 locationStatusLabel은 결정 1(웹 토글 접점 제거)로 삭제됨 —
 * 토글 문구 케이스는 모바일 단독 단정으로 전환 (구 regions·recent-history parity 선례).
 */
interface WebProfileEditModule {
  canSaveProfile: typeof canSaveProfile;
}
const WEB_PROFILE_EDIT_PATH = new URL(
  "../../../../../web/src/features/profile/model/profile-edit.ts",
  import.meta.url,
).pathname;
const loadWebProfileEdit = (): Promise<WebProfileEditModule> =>
  import(WEB_PROFILE_EDIT_PATH);

describe("profile-edit 동등성 (AC 15·16)", () => {
  it("위치정보 토글 문구가 켜짐 '사용 중'/꺼짐 '사용 안 함'이다 (AC 15, 추정 3 — 웹 원본 삭제로 모바일 단독)", () => {
    expect(locationStatusLabel(true)).toBe("사용 중");
    expect(locationStatusLabel(false)).toBe("사용 안 함");
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
