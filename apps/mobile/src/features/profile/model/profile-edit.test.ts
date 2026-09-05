import { describe, expect, it } from "vitest";
import { resolveProfileImageAction } from "./profile-edit";

/**
 * 템플릿 ① 순수 로직 — [저장] 시 이미지 액션 판정 (MSG-564 기준 6, 결정 D2).
 * 웹은 이 판정을 `ProfileEditModal.handleConfirm`에 인라인으로 두지만 모바일은 렌더 테스트가
 * 없어 순수 함수로 뗀다 — 웹에 없는 함수라 parity가 아닌 단독 단정 (`shouldRemoveProfileImage` 선례).
 */
describe("resolveProfileImageAction — 마지막 조작이 이긴다 (기준 6)", () => {
  it("선택 후 [기본 이미지로]면 삭제다 — 선택은 폐기된다 (기준 6)", () => {
    expect(
      resolveProfileImageAction({
        hasSelection: true,
        removalReserved: true,
        profileImageUrl: "https://cdn/a.jpg",
      }),
    ).toBe("remove");
  });

  it("[기본 이미지로] 후 선택이면 업로드다 — 예약은 해제된다 (기준 6)", () => {
    expect(
      resolveProfileImageAction({
        hasSelection: true,
        removalReserved: false,
        profileImageUrl: "https://cdn/a.jpg",
      }),
    ).toBe("upload");
  });

  it("선택도 예약도 없으면 아무 요청도 없다 (기준 6)", () => {
    expect(
      resolveProfileImageAction({
        hasSelection: false,
        removalReserved: false,
        profileImageUrl: "https://cdn/a.jpg",
      }),
    ).toBe("none");
  });

  it("예약인데 이미 기본 이미지면 무변경이다 — 요청 생략 (기준 6)", () => {
    expect(
      resolveProfileImageAction({
        hasSelection: false,
        removalReserved: true,
        profileImageUrl: null,
      }),
    ).toBe("none");
  });
});
