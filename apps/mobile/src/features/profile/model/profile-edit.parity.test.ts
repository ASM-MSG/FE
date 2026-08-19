import { describe, expect, it } from "vitest";
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
  canSaveProfile,
  nicknameError,
  resolveNicknameSave,
  shouldRemoveProfileImage,
} from "./profile-edit";

/**
 * 템플릿 ① 순수 로직 — 프로필 편집 폼 검증이 웹 원본과 동등하다 (기준 17, parity).
 * [MSG-426] 모바일에는 `canSaveProfile`(공백만 차단)뿐이라 1자 닉네임이 통과해 서버 400을
 * 부르는 웹의 구 결함을 그대로 갖고 있었다 — 웹 MSG-329 A7판(2~20자 + 사유 문구)을 포팅한다.
 * 구 `locationStatusLabel` 케이스는 유일 사용처(편집 화면 위치정보 토글)가 기준 16으로
 * 제거되면서 함께 삭제됐다 (웹도 MSG-407에서 같은 이유로 삭제).
 */
interface WebProfileEditModule {
  NICKNAME_MIN_LENGTH: number;
  NICKNAME_MAX_LENGTH: number;
  nicknameError: typeof nicknameError;
  canSaveProfile: typeof canSaveProfile;
}
const WEB_PROFILE_EDIT_PATH = new URL(
  "../../../../../web/src/features/profile/model/profile-edit.ts",
  import.meta.url,
).pathname;
const loadWebProfileEdit = (): Promise<WebProfileEditModule> =>
  import(WEB_PROFILE_EDIT_PATH);

/** 경계 안팎 + 공백 처리 — 두 구현이 갈릴 수 있는 길이 전부 */
const samples = [
  "",
  "   ",
  "\t\n",
  "가",
  " 가 ",
  "가나",
  "필맵퍼",
  " 필맵퍼 ",
  "가".repeat(20),
  "가".repeat(21),
  ` ${"가".repeat(20)} `,
];

describe("profile-edit 닉네임 검증 동등성 (기준 17)", () => {
  it("닉네임 길이 경계 상수가 웹과 같은 2~20자다 (기준 17)", async () => {
    const web = await loadWebProfileEdit();

    expect(NICKNAME_MIN_LENGTH).toBe(web.NICKNAME_MIN_LENGTH);
    expect(NICKNAME_MAX_LENGTH).toBe(web.NICKNAME_MAX_LENGTH);
  });

  it("2~20자(trim 기준) 밖이면 사유 문구를, 안이면 null을 돌려준다 (기준 17)", () => {
    expect(nicknameError("가")).toBe("닉네임은 2~20자로 입력해주세요");
    expect(nicknameError("가".repeat(21))).toBe(
      "닉네임은 2~20자로 입력해주세요",
    );
    expect(nicknameError(" 가 ")).toBe("닉네임은 2~20자로 입력해주세요");
    expect(nicknameError("필맵퍼")).toBeNull();
  });

  it("nicknameError·canSaveProfile이 모든 표본에서 웹 원본과 동등하다 (기준 17, parity)", async () => {
    const web = await loadWebProfileEdit();

    for (const nickname of samples) {
      expect(nicknameError(nickname)).toBe(web.nicknameError(nickname));
      expect(canSaveProfile(nickname)).toBe(web.canSaveProfile(nickname));
    }
  });

  it("1자 닉네임은 저장 불가다 — 구 '공백만 차단'이 통과시켜 서버 400을 부르던 지점 (기준 17)", () => {
    expect(canSaveProfile("가")).toBe(false);
    expect(canSaveProfile("가나")).toBe(true);
  });
});

/**
 * 웹은 이 판정을 모달 핸들러 안에 인라인으로 두지만(`removalReserved && profileImageUrl !== null`),
 * 모바일은 화면 렌더 테스트가 없어 순수 함수로 떼어 고정한다 — 모바일 단독 단정
 * (구 locationStatusLabel 케이스와 같은 처리).
 */
describe("기본 이미지 되돌리기 요청 여부 (기준 15)", () => {
  it("올린 사진이 있는 상태에서 예약하면 삭제 요청이 필요하다 (기준 15)", () => {
    expect(shouldRemoveProfileImage(true, "https://cdn/a.jpg")).toBe(true);
  });

  it("이미 기본 이미지면 예약해도 요청이 나가지 않는다 — 무변경 저장 (기준 15)", () => {
    expect(shouldRemoveProfileImage(true, null)).toBe(false);
  });

  it("예약하지 않았으면 사진이 있어도 요청이 나가지 않는다 — [취소]·뒤로가기로 예약이 폐기된 경로 (기준 15)", () => {
    expect(shouldRemoveProfileImage(false, "https://cdn/a.jpg")).toBe(false);
  });
});

/**
 * 구 profile-store가 저장 시점에 하던 trim을 승계한 회귀 가드. 스토어가 MSG-426에서
 * 폐기되면서 이 단정이 어느 테스트에도 남지 않게 된 것을 검증 단계가 잡았다.
 */
describe("저장할 닉네임 정규화", () => {
  it("앞뒤 공백이 섞인 닉네임은 trim해 저장한다 — 공백 선두 닉네임이 아바타 이니셜을 빈 칸으로 만드는 결함 방지 (MSG-306 리뷰 반영 승계)", () => {
    expect(resolveNicknameSave(" 필맵퍼 ", "이전값")).toEqual({
      nickname: "필맵퍼",
      shouldRequest: true,
    });
  });

  it("trim 결과가 현재 값과 같으면 요청을 만들지 않는다 — 공백만 덧붙인 무변경 저장", () => {
    expect(resolveNicknameSave(" 필맵퍼 ", "필맵퍼")).toEqual({
      nickname: "필맵퍼",
      shouldRequest: false,
    });
  });
});
