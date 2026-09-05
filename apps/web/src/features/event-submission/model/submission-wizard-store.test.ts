import { beforeEach, describe, expect, it } from "vitest";
import {
  isSubmissionDirty,
  submissionWizardMode,
  toDraftState,
  useSubmissionWizardStore,
} from "./submission-wizard-store";

const store = () => useSubmissionWizardStore.getState();

/** 확정 영역 사각형 2개 — 서면 격자 인덱스 (MSG-547) */
const RECT_A = {
  minGridX: 11420,
  maxGridX: 11422,
  minGridY: 16858,
  maxGridY: 16860,
};
const RECT_B = {
  minGridX: 11430,
  maxGridX: 11431,
  minGridY: 16868,
  maxGridY: 16869,
};

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

describe("useSubmissionWizardStore — 위치 영역 확정 (MSG-547 AC 5·6·11·12)", () => {
  beforeEach(() => {
    useSubmissionWizardStore.setState(
      useSubmissionWizardStore.getInitialState(),
      true,
    );
  });

  /** 지역축제로 공통·유형 전용·이미지·영역까지 다 채운 상태 — 유형 변경 초기화의 전제 */
  const fillFestivalDraftWithArea = () => {
    store().selectType("FESTIVAL");
    store().setCommonField("title", "광안리 M 드론쇼");
    store().setTypeFieldValue("드론 공연 · 체험 부스");
    store().startImageUpload("blob:preview-1");
    store().completeImageUpload("pending/submissions/abc.jpg");
    store().addAreaRect(RECT_A);
  };

  /** 초기화 규칙이 적용됐는지 — 입력·유형 전용·이미지·영역 전부 (AC 12) */
  const expectDraftCleared = () => {
    expect(store().areaRects).toEqual([]);
    expect(store().common.title).toBe("");
    expect(store().typeFieldValues.FESTIVAL).toBe("");
    expect(store().image.s3Key).toBeNull();
  };

  it("초기 상태에는 확정된 영역이 없다 (AC 1)", () => {
    expect(store().areaRects).toEqual([]);
  });

  it("영역을 추가하면 확정 목록에 순서대로 쌓인다 (AC 5)", () => {
    store().addAreaRect(RECT_A);
    store().addAreaRect(RECT_B);

    expect(store().areaRects).toEqual([RECT_A, RECT_B]);
  });

  it("영역을 삭제하면 그 인덱스의 사각형만 빠진다 (AC 6)", () => {
    store().addAreaRect(RECT_A);
    store().addAreaRect(RECT_B);

    store().removeAreaRect(0);

    expect(store().areaRects).toEqual([RECT_B]);
  });

  it("스텝을 오가도 확정 영역은 보존된다 (AC 11)", () => {
    store().selectType("FESTIVAL");
    store().goToStep("area");
    store().addAreaRect(RECT_A);

    store().goToStep("basic");
    store().goToStep("area");

    expect(store().areaRects).toEqual([RECT_A]);
  });

  it("reset은 확정 영역까지 비운다 (AC 14 — 재진입)", () => {
    store().addAreaRect(RECT_A);

    store().reset();

    expect(store().areaRects).toEqual([]);
  });

  it("확정 영역이 있는 상태에서 다른 유형을 선택하면 입력·이미지·영역이 초기화된다 (AC 12)", () => {
    fillFestivalDraftWithArea();

    store().selectType("POPUP");

    expect(store().type).toBe("POPUP");
    expectDraftCleared();
  });

  it("확정 영역이 있어도 같은 유형을 다시 선택하면 초기화되지 않는다 (AC 12 경계)", () => {
    store().selectType("FESTIVAL");
    store().setCommonField("title", "광안리 M 드론쇼");
    store().addAreaRect(RECT_A);

    store().selectType("FESTIVAL");

    expect(store().areaRects).toEqual([RECT_A]);
    expect(store().common.title).toBe("광안리 M 드론쇼");
  });

  it("확정 영역이 0개면 유형 변경은 기존 보존 동작을 유지한다 (AC 12 · MSG-546 AC 13)", () => {
    store().selectType("FESTIVAL");
    store().setCommonField("title", "광안리 M 드론쇼");

    store().selectType("POPUP");

    expect(store().common.title).toBe("광안리 M 드론쇼");
  });

  // EVENT는 카드 클릭이 selectType을 부르지 않는다 — 모달을 열고 확정이 곧 유형 확정이다
  // (TypeSelectStep: `if (next === "EVENT") { setModalOpen(true); return; }`).
  // 그래서 초기화 규칙이 selectType에만 있으면 EVENT로 갈아탈 때 통째로 새어나간다
  // (codex 리뷰 P1 — 회귀 테스트).
  it("확정 영역이 있는 상태에서 EVENT를 확정하면 입력·이미지·영역이 초기화된다 (AC 12 — EVENT 경로)", () => {
    fillFestivalDraftWithArea();

    store().confirmEventParent({ occurrenceId: 412, name: "광안리 M 드론쇼" });

    expect(store().type).toBe("EVENT");
    expectDraftCleared();
    // 확정한 소속 행사와 스텝 전이는 유지된다 (MSG-546 추정 3)
    expect(store().parentOccurrence?.occurrenceId).toBe(412);
    expect(store().step).toBe("basic");
  });

  it("이미 EVENT인 상태에서 소속 행사만 바꿔 확정하면 초기화되지 않는다 (AC 12 경계 — selectType과 대칭)", () => {
    store().confirmEventParent({ occurrenceId: 412, name: "광안리 M 드론쇼" });
    store().setCommonField("title", "광안리 M 드론쇼");
    store().addAreaRect(RECT_A);

    store().confirmEventParent({ occurrenceId: 777, name: "해운대 불꽃축제" });

    expect(store().areaRects).toEqual([RECT_A]);
    expect(store().common.title).toBe("광안리 M 드론쇼");
    expect(store().parentOccurrence?.occurrenceId).toBe(777);
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

  it("확정한 위치 영역이 제출 조립 재료로 실린다 (MSG-548 AC 4·7)", () => {
    store().addAreaRect(RECT_A);
    store().addAreaRect(RECT_B);

    expect(toDraftState(store()).areaRects).toEqual([RECT_A, RECT_B]);
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

  it("확정한 위치 영역이 있으면 작성 중이다 (MSG-547 AC 13)", () => {
    // 스텝은 초기값(type) 그대로 — 영역 자체가 dirty 근거임을 분리해 본다
    store().addAreaRect(RECT_A);

    expect(isSubmissionDirty(store())).toBe(true);
  });

  it("reset 후에는 다시 작성 중이 아니다 (AC 14)", () => {
    store().setCommonField("title", "광안리");

    store().reset();

    expect(isSubmissionDirty(store())).toBe(false);
  });
});

/** 수정 모드 프리필 패치 한 벌 (MSG-550) — 반려된 지역축제 신청 */
const HYDRATE_PATCH = {
  submissionId: 12,
  type: "FESTIVAL" as const,
  parentOccurrence: null,
  common: {
    title: "서면 야간 드론쇼",
    organizerName: "서면상권활성화협의회",
    startsOn: "2026-09-05",
    endsOn: "2026-09-07",
    description: "서면 일대에서 열리는 야간 드론쇼입니다.",
  },
  typeFieldValue: "드론 라이트쇼 · 거리 버스킹",
  keptImageUrl: "https://cdn.example.test/seomyeon-drone.jpg",
  areaRects: [RECT_A],
  rejection: {
    reasonCodes: ["PERIOD", "IMAGE"],
    reasonText: "행사 기간과 홍보 이미지를 확인해 주세요.",
  },
  droppedLocations: false,
};

describe("hydrate — 수정 모드 프리필 (MSG-550 AC 1·2·4)", () => {
  beforeEach(() => {
    useSubmissionWizardStore.setState(
      useSubmissionWizardStore.getInitialState(),
      true,
    );
  });

  it("서버 제출값이 한 번에 채워지고 시작 스텝은 기본 정보다 (AC 1)", () => {
    store().hydrate(HYDRATE_PATCH);

    expect(store().step).toBe("basic");
    expect(store().type).toBe("FESTIVAL");
    expect(store().common.title).toBe("서면 야간 드론쇼");
    expect(store().typeFieldValues.FESTIVAL).toBe(
      "드론 라이트쇼 · 거리 버스킹",
    );
    expect(store().areaRects).toEqual([RECT_A]);
  });

  it("대표 이미지는 서버 URL이 미리보기이자 유지 표식이 된다 — s3Key는 없다 (AC 4)", () => {
    store().hydrate(HYDRATE_PATCH);

    expect(store().image.previewUrl).toBe(
      "https://cdn.example.test/seomyeon-drone.jpg",
    );
    expect(store().image.s3Key).toBeNull();
    expect(toDraftState(store()).imageKept).toBe(true);
  });

  it("hydrate 후에는 수정 모드이고 반려 사유·신청 id를 들고 있다 (AC 1·3)", () => {
    store().hydrate(HYDRATE_PATCH);

    expect(submissionWizardMode(store())).toBe("edit");
    expect(store().editContext).toEqual({
      submissionId: 12,
      rejection: HYDRATE_PATCH.rejection,
      droppedLocations: false,
    });
  });

  it("신규 등록은 수정 모드가 아니다 (AC 10)", () => {
    store().selectType("FESTIVAL");

    expect(submissionWizardMode(store())).toBe("create");
    expect(store().editContext).toBeNull();
  });

  it("reset은 수정 모드 컨텍스트·유지 이미지까지 되돌린다 (AC 1·10)", () => {
    store().hydrate(HYDRATE_PATCH);

    store().reset();

    expect(store().editContext).toBeNull();
    expect(store().step).toBe("type");
    expect(store().type).toBeNull();
    expect(store().image.previewUrl).toBeNull();
    expect(toDraftState(store()).imageKept).toBe(false);
    expect(submissionWizardMode(store())).toBe("create");
  });

  it("유지 상태에서 새 업로드가 실패하면 서버 이미지 상태로 복원된다 (AC 4 — 추정 5)", () => {
    store().hydrate(HYDRATE_PATCH);
    store().startImageUpload("blob:preview-1");

    store().failImageUpload("업로드에 실패했어요");

    expect(store().image.previewUrl).toBe(
      "https://cdn.example.test/seomyeon-drone.jpg",
    );
    expect(store().image.errorMessage).toBe("업로드에 실패했어요");
    expect(toDraftState(store()).imageKept).toBe(true);
  });

  it("신규 등록의 업로드 실패는 종전대로 미리보기를 남기지 않는다 (MSG-546 AC 8 — 보존)", () => {
    store().selectType("FESTIVAL");
    store().startImageUpload("blob:preview-1");

    store().failImageUpload("업로드에 실패했어요");

    expect(store().image.previewUrl).toBeNull();
    expect(toDraftState(store()).imageKept).toBe(false);
  });
});

describe("isSubmissionDirty — 수정 모드 기준선 (MSG-550 AC 9)", () => {
  beforeEach(() => {
    useSubmissionWizardStore.setState(
      useSubmissionWizardStore.getInitialState(),
      true,
    );
  });

  it("프리필 직후에는 작성 중이 아니다 (AC 9)", () => {
    store().hydrate(HYDRATE_PATCH);

    expect(isSubmissionDirty(store())).toBe(false);
  });

  it("스텝만 옮겨 다녀도 작성 중이 아니다 (AC 9)", () => {
    store().hydrate(HYDRATE_PATCH);

    store().goToStep("area");
    store().goToStep("review");

    expect(isSubmissionDirty(store())).toBe(false);
  });

  it("프리필 값을 하나라도 바꾸면 작성 중이다 (AC 9)", () => {
    store().hydrate(HYDRATE_PATCH);

    store().setCommonField("title", "서면 야간 드론쇼 2회차");

    expect(isSubmissionDirty(store())).toBe(true);
  });

  it("프리필된 영역을 지우면 작성 중이다 (AC 9)", () => {
    store().hydrate(HYDRATE_PATCH);

    store().removeAreaRect(0);

    expect(isSubmissionDirty(store())).toBe(true);
  });
});
