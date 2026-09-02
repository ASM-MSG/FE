import { beforeEach, describe, expect, it } from "vitest";
import {
  isSubmissionDirty,
  toDraftState,
  useSubmissionWizardStore,
} from "./submission-wizard-store";

const store = () => useSubmissionWizardStore.getState();

describe("useSubmissionWizardStore — 위저드 상태 소유 (AC 12·13·14)", () => {
  beforeEach(() => {
    useSubmissionWizardStore.setState(
      useSubmissionWizardStore.getInitialState(),
      true,
    );
  });

  it("초기 상태는 유형 스텝이고 아무 유형도 선택되어 있지 않다 (AC 1)", () => {
    expect(store().step).toBe("type");
    expect(store().type).toBeNull();
    expect(store().parentOccurrence).toBeNull();
  });

  it("지역축제를 선택하면 유형만 확정되고 스텝은 그대로다 (AC 2)", () => {
    store().selectType("FESTIVAL");

    expect(store().type).toBe("FESTIVAL");
    expect(store().step).toBe("type");
  });

  it("소속 이벤트를 확정하면 parentOccurrenceId가 저장되고 기본 정보 스텝으로 전이된다 (AC 5)", () => {
    store().confirmEventParent({ occurrenceId: 412, name: "광안리 M 드론쇼" });

    expect(store().type).toBe("EVENT");
    expect(store().parentOccurrence).toEqual({
      occurrenceId: 412,
      name: "광안리 M 드론쇼",
    });
    expect(store().step).toBe("basic");
  });

  it("유형을 바꿔도 공통 필드 입력은 유지된다 (AC 13)", () => {
    store().selectType("FESTIVAL");
    store().setCommonField("title", "광안리 M 드론쇼");

    store().selectType("POPUP");

    expect(store().common.title).toBe("광안리 M 드론쇼");
  });

  it("유형 전용 필드는 유형별로 각자 보관돼 전환-복귀 시 복원된다 (AC 13)", () => {
    store().selectType("FESTIVAL");
    store().setTypeFieldValue("드론 공연 · 체험 부스");
    store().selectType("POPUP");
    store().setTypeFieldValue("11:00 ~ 20:00");

    store().selectType("FESTIVAL");

    expect(store().typeFieldValues.FESTIVAL).toBe("드론 공연 · 체험 부스");
    expect(store().typeFieldValues.POPUP).toBe("11:00 ~ 20:00");
  });

  it("이미지 업로드가 성공하면 s3Key와 미리보기가 보관된다 (AC 7)", () => {
    store().startImageUpload("blob:preview-1");
    store().completeImageUpload("pending/submissions/abc.jpg");

    expect(store().image.status).toBe("uploaded");
    expect(store().image.s3Key).toBe("pending/submissions/abc.jpg");
    expect(store().image.previewUrl).toBe("blob:preview-1");
  });

  it("재선택하면 새 s3Key로 교체된다 (AC 7)", () => {
    store().startImageUpload("blob:preview-1");
    store().completeImageUpload("pending/submissions/abc.jpg");

    store().startImageUpload("blob:preview-2");
    store().completeImageUpload("pending/submissions/def.png");

    expect(store().image.s3Key).toBe("pending/submissions/def.png");
    expect(store().image.previewUrl).toBe("blob:preview-2");
  });

  it("업로드가 실패하면 안내 문구만 남고 s3Key는 저장되지 않는다 (AC 8)", () => {
    store().startImageUpload("blob:preview-1");
    store().completeImageUpload("pending/submissions/abc.jpg");

    store().failImageUpload("이미지 업로드에 실패했어요");

    expect(store().image.status).toBe("failed");
    expect(store().image.s3Key).toBeNull();
    expect(store().image.errorMessage).toBe("이미지 업로드에 실패했어요");
  });

  it("reset은 위저드를 초기 상태로 되돌린다 (AC 14 — 재진입)", () => {
    store().confirmEventParent({ occurrenceId: 412, name: "광안리 M 드론쇼" });
    store().setCommonField("title", "광안리 M 드론쇼");

    store().reset();

    expect(store().step).toBe("type");
    expect(store().type).toBeNull();
    expect(store().parentOccurrence).toBeNull();
    expect(store().common.title).toBe("");
  });
});

describe("toDraftState — 폼 판정용 파생 (AC 10)", () => {
  beforeEach(() => {
    useSubmissionWizardStore.setState(
      useSubmissionWizardStore.getInitialState(),
      true,
    );
  });

  it("parentOccurrence는 id로, 이미지는 s3Key로 납작해진다 (AC 10)", () => {
    store().confirmEventParent({ occurrenceId: 412, name: "광안리 M 드론쇼" });
    store().startImageUpload("blob:preview-1");
    store().completeImageUpload("pending/submissions/abc.jpg");

    const draft = toDraftState(store());

    expect(draft.parentOccurrenceId).toBe(412);
    expect(draft.imageS3Key).toBe("pending/submissions/abc.jpg");
  });
});

describe("isSubmissionDirty — 이탈 경고 판정 (AC 14)", () => {
  beforeEach(() => {
    useSubmissionWizardStore.setState(
      useSubmissionWizardStore.getInitialState(),
      true,
    );
  });

  it("아무것도 하지 않은 상태는 작성 중이 아니다 (AC 14)", () => {
    expect(isSubmissionDirty(store())).toBe(false);
  });

  it("유형만 골라 스텝 1에 머무르면 작성 중이 아니다 (AC 14)", () => {
    store().selectType("FESTIVAL");

    expect(isSubmissionDirty(store())).toBe(false);
  });

  it("입력이 하나라도 있으면 작성 중이다 (AC 14)", () => {
    store().setCommonField("title", "광");

    expect(isSubmissionDirty(store())).toBe(true);
  });

  it("기본 정보 스텝으로 넘어가면 작성 중이다 (AC 14)", () => {
    store().selectType("FESTIVAL");
    store().goToStep("basic");

    expect(isSubmissionDirty(store())).toBe(true);
  });

  it("reset 후에는 다시 작성 중이 아니다 (AC 14)", () => {
    store().setCommonField("title", "광안리");

    store().reset();

    expect(isSubmissionDirty(store())).toBe(false);
  });
});
