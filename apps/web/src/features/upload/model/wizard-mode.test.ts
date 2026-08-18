import { describe, expect, it } from "vitest";
import { replaceGridLabel, wizardModeCopy } from "./wizard-mode";

describe("replaceGridLabel — 교체 모드 위치 라벨 (MSG-415 추정 1)", () => {
  it("zoneName·zoneCell이 모두 있으면 '서면 A-02'로 조합한다", () => {
    expect(replaceGridLabel("서면", "A-02")).toBe("서면 A-02");
  });

  it("어느 하나라도 없으면 null — 위치 라벨을 생략한다 (경계)", () => {
    expect(replaceGridLabel(null, "A-02")).toBeNull();
    expect(replaceGridLabel("서면", null)).toBeNull();
    expect(replaceGridLabel(null, null)).toBeNull();
  });
});

describe("wizardModeCopy — 모드별 확정 버튼·완료 문구 (MSG-415 AC 2, 추정 3)", () => {
  it("교체 모드면 '교체하기'·'교체 완료!' 문구 세트다", () => {
    const copy = wizardModeCopy(true);

    expect(copy.confirmLabel).toBe("교체하기");
    expect(copy.submittingLabel).toBe("교체 중…");
    expect(copy.completedTitle).toBe("교체 완료!");
  });

  it("일반 업로드 모드면 기존 '업로드하기'·'업로드 완료!' 그대로다 (AC 6 회귀 없음)", () => {
    const copy = wizardModeCopy(false);

    expect(copy.confirmLabel).toBe("업로드하기");
    expect(copy.submittingLabel).toBe("업로드 중…");
    expect(copy.completedTitle).toBe("업로드 완료!");
  });

  it("완료 안내는 두 모드 동일 — 교체 직후에도 UPLOADED라 블러 안내가 그대로 유효하다 (추정 3)", () => {
    expect(wizardModeCopy(true).completedDescription).toBe(
      wizardModeCopy(false).completedDescription,
    );
  });
});
