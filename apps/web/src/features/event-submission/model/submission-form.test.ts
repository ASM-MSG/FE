import { describe, expect, it } from "vitest";
// MSG-548: 완전 입력 draft는 검토 요약 테스트와 공유한다(중복 게이트 검출 — 픽스처 추출).
// 기본 픽스처의 areaRects는 비어 있어 546·547 시절 조립 단정이 그대로 유효하다
import { areaRect, FESTIVAL_DRAFT } from "@/test/submission-draft-fixture";
import {
  continueWithLabel,
  isBasicStepComplete,
  PERIOD_ORDER_MESSAGE,
  PERIOD_PAST_MESSAGE,
  periodIssueMessage,
  SUBMISSION_FORM_CONFIGS,
  SUBMISSION_TYPE_CARDS,
  toCreateDraft,
  toCreateRequest,
} from "./submission-form";

const RECT_A = areaRect(39064, 112221, 39065, 112222);

describe("SUBMISSION_FORM_CONFIGS — 유형별 폼 설정 3벌 (AC 6)", () => {
  it("지역축제는 축제명·주요 프로그램 라벨과 '다음: 축제 위치 등록' CTA를 쓴다 (AC 6)", () => {
    const config = SUBMISSION_FORM_CONFIGS.FESTIVAL;

    expect(config.heading).toBe("지역축제 기본 정보");
    expect(config.titleLabel).toBe("축제명");
    expect(config.periodLabel).toBe("축제 기간");
    expect(config.typeFieldLabel).toBe("주요 프로그램");
    expect(config.typeFieldKey).toBe("programDescription");
    expect(config.imageLabel).toBe("대표 이미지");
    expect(config.ctaLabel).toBe("다음: 축제 위치 등록");
    expect(config.footnote).toBe(
      "행사 등록은 건별 관리자 승인 후 일반 유저 지도와 기존 행사방에 노출됩니다.",
    );
  });

  it("팝업스토어는 팝업명·운영 시간 라벨과 '다음: 매장 위치 등록' CTA를 쓴다 (AC 6)", () => {
    const config = SUBMISSION_FORM_CONFIGS.POPUP;

    expect(config.titleLabel).toBe("팝업명");
    expect(config.organizerLabel).toBe("브랜드 / 운영사");
    expect(config.periodLabel).toBe("운영 기간");
    expect(config.typeFieldLabel).toBe("운영 시간");
    expect(config.typeFieldKey).toBe("operatingHours");
    expect(config.ctaLabel).toBe("다음: 매장 위치 등록");
  });

  it("이벤트는 행사방 이름·참여 방식 라벨과 커버 이미지·'다음: 대표 위치 등록'을 쓴다 (AC 6)", () => {
    const config = SUBMISSION_FORM_CONFIGS.EVENT;

    expect(config.titleLabel).toBe("행사방 이름");
    expect(config.organizerLabel).toBe("운영 주체");
    expect(config.periodLabel).toBe("공개 기간");
    expect(config.typeFieldLabel).toBe("참여 방식");
    expect(config.typeFieldKey).toBe("participationMethod");
    expect(config.imageLabel).toBe("커버 이미지");
    expect(config.ctaLabel).toBe("다음: 대표 위치 등록");
    expect(config.footnote).toBe(
      "승인 후 공개 행사방이 생성되고 대표 위치가 일반 유저 지도에 표시됩니다.",
    );
  });
});

describe("SUBMISSION_TYPE_CARDS — 유형 카드 3종 (AC 1)", () => {
  it("지역축제·팝업스토어·이벤트 세 장이고 지역축제만 배지형 메타다 (AC 1)", () => {
    expect(SUBMISSION_TYPE_CARDS.map((card) => card.type)).toEqual([
      "FESTIVAL",
      "POPUP",
      "EVENT",
    ]);
    expect(SUBMISSION_TYPE_CARDS.map((card) => card.metaVariant)).toEqual([
      "badge",
      "text",
      "text",
    ]);
  });

  it("팝업스토어 메타는 실제 입력 항목(운영 기간·운영 시간) 문구다 (승인 확정)", () => {
    const popup = SUBMISSION_TYPE_CARDS.find((card) => card.type === "POPUP");

    expect(popup?.meta).toBe("운영 기간 · 운영 시간");
  });
});

describe("continueWithLabel — 계속 버튼 문구 (AC 2·5)", () => {
  it("받침 없는 이름은 '로 계속'이다 (AC 2)", () => {
    expect(continueWithLabel("지역축제")).toBe("지역축제로 계속");
  });

  it("받침 있는 이름은 '으로 계속'이다 (AC 5)", () => {
    expect(continueWithLabel("포켓몬 메가페스타 부산")).toBe(
      "포켓몬 메가페스타 부산으로 계속",
    );
  });
});

describe("isBasicStepComplete — 필수값 판정 (AC 10)", () => {
  it("공통 필드·유형 전용 필드·이미지가 모두 차면 진행할 수 있다 (AC 10)", () => {
    expect(isBasicStepComplete(FESTIVAL_DRAFT)).toBe(true);
  });

  it("제목이 공백뿐이면 진행할 수 없다 (AC 10)", () => {
    expect(
      isBasicStepComplete({
        ...FESTIVAL_DRAFT,
        common: { ...FESTIVAL_DRAFT.common, title: "   " },
      }),
    ).toBe(false);
  });

  it("이미지 s3Key가 없으면 진행할 수 없다 (AC 10)", () => {
    expect(isBasicStepComplete({ ...FESTIVAL_DRAFT, imageS3Key: null })).toBe(
      false,
    );
  });

  it("선택 유형의 전용 필드가 비면 진행할 수 없다 (AC 10)", () => {
    expect(
      isBasicStepComplete({
        ...FESTIVAL_DRAFT,
        typeFieldValues: { ...FESTIVAL_DRAFT.typeFieldValues, FESTIVAL: "" },
      }),
    ).toBe(false);
  });

  it("다른 유형의 전용 필드가 비어 있어도 진행에는 영향이 없다 (AC 13)", () => {
    expect(
      isBasicStepComplete({
        ...FESTIVAL_DRAFT,
        typeFieldValues: {
          ...FESTIVAL_DRAFT.typeFieldValues,
          POPUP: "",
          EVENT: "",
        },
      }),
    ).toBe(true);
  });

  it("이벤트는 parentOccurrenceId가 없으면 진행할 수 없다 (AC 10)", () => {
    const eventDraft = {
      ...FESTIVAL_DRAFT,
      type: "EVENT" as const,
      parentOccurrenceId: null,
    };

    expect(isBasicStepComplete(eventDraft)).toBe(false);
    expect(
      isBasicStepComplete({ ...eventDraft, parentOccurrenceId: 412 }),
    ).toBe(true);
  });

  it("유형이 없으면 진행할 수 없다 (경계)", () => {
    expect(isBasicStepComplete({ ...FESTIVAL_DRAFT, type: null })).toBe(false);
  });
});

describe("periodIssueMessage — 날짜 검증 (AC 11)", () => {
  it("종료일이 시작일보다 앞서면 안내 문구를 돌려준다 (AC 11)", () => {
    expect(
      periodIssueMessage(
        { startsOn: "2026-09-07", endsOn: "2026-09-05" },
        "2026-09-01",
      ),
    ).toBe(PERIOD_ORDER_MESSAGE);
  });

  it("종료일이 오늘보다 앞서면 서버 13433을 선반영해 막는다 (AC 11)", () => {
    expect(
      periodIssueMessage(
        { startsOn: "2026-08-20", endsOn: "2026-08-31" },
        "2026-09-01",
      ),
    ).toBe(PERIOD_PAST_MESSAGE);
  });

  it("종료일이 오늘과 같으면 통과한다 (경계 — 오늘 이전만 거부)", () => {
    expect(
      periodIssueMessage(
        { startsOn: "2026-08-20", endsOn: "2026-09-01" },
        "2026-09-01",
      ),
    ).toBeNull();
  });

  it("시작일·종료일이 같은 하루 행사는 통과한다 (경계)", () => {
    expect(
      periodIssueMessage(
        { startsOn: "2026-09-05", endsOn: "2026-09-05" },
        "2026-09-01",
      ),
    ).toBeNull();
  });

  it("날짜가 아직 비어 있으면 안내하지 않는다 — 필수값 판정의 몫이다 (AC 10·11)", () => {
    expect(
      periodIssueMessage({ startsOn: "", endsOn: "" }, "2026-09-01"),
    ).toBeNull();
    expect(
      periodIssueMessage({ startsOn: "2026-09-05", endsOn: "" }, "2026-09-01"),
    ).toBeNull();
  });
});

describe("toCreateDraft — 제출 본문 부분형 조립 (AC 6·12 — 13439 구조 예방)", () => {
  it("지역축제는 programDescription만 싣고 다른 유형 전용 필드는 빼고 조립한다 (AC 6)", () => {
    expect(toCreateDraft(FESTIVAL_DRAFT)).toEqual({
      type: "FESTIVAL",
      title: "광안리 M 드론쇼",
      organizerName: "부산광역시 관광마이스과",
      startsOn: "2026-09-05",
      endsOn: "2026-09-07",
      description: "광안리 해변의 밤하늘을 수놓는 정기 드론 공연입니다.",
      imageS3Key: "pending/submissions/abc.jpg",
      programDescription: "드론 공연 · 체험 부스",
    });
  });

  it("팝업스토어는 operatingHours만 싣는다 (AC 6)", () => {
    const draft = toCreateDraft({ ...FESTIVAL_DRAFT, type: "POPUP" });

    expect(draft?.operatingHours).toBe("11:00 ~ 20:00");
    expect(draft).not.toHaveProperty("programDescription");
    expect(draft).not.toHaveProperty("participationMethod");
  });

  it("이벤트는 participationMethod와 parentOccurrenceId를 싣는다 (AC 6)", () => {
    const draft = toCreateDraft({
      ...FESTIVAL_DRAFT,
      type: "EVENT",
      parentOccurrenceId: 412,
    });

    expect(draft?.participationMethod).toBe("현장 참여 후 영상 업로드");
    expect(draft?.parentOccurrenceId).toBe(412);
    expect(draft).not.toHaveProperty("programDescription");
  });

  it("이벤트가 아니면 parentOccurrenceId를 싣지 않는다 (13439 예방)", () => {
    expect(
      toCreateDraft({ ...FESTIVAL_DRAFT, parentOccurrenceId: 412 }),
    ).not.toHaveProperty("parentOccurrenceId");
  });

  it("유형이 없으면 조립하지 않는다 (경계)", () => {
    expect(toCreateDraft({ ...FESTIVAL_DRAFT, type: null })).toBeNull();
  });

  it("확정 영역은 단일 위치(locations 1개)로 조립된다 (MSG-548 AC 7)", () => {
    const draft = toCreateDraft({ ...FESTIVAL_DRAFT, areaRects: [RECT_A] });

    expect(draft?.locations).toEqual([{ areaRects: [RECT_A] }]);
  });

  it("확정 영역이 없으면 locations를 싣지 않는다 (MSG-548 AC 7 — 경계)", () => {
    expect(toCreateDraft(FESTIVAL_DRAFT)).not.toHaveProperty("locations");
  });
});

describe("toCreateRequest — 제출 발사의 단일 관문 (MSG-548 AC 7)", () => {
  it("필수값과 확정 영역이 모두 갖춰지면 완전한 제출 본문을 돌려준다 (AC 7)", () => {
    expect(toCreateRequest({ ...FESTIVAL_DRAFT, areaRects: [RECT_A] })).toEqual(
      {
        type: "FESTIVAL",
        title: "광안리 M 드론쇼",
        organizerName: "부산광역시 관광마이스과",
        startsOn: "2026-09-05",
        endsOn: "2026-09-07",
        description: "광안리 해변의 밤하늘을 수놓는 정기 드론 공연입니다.",
        imageS3Key: "pending/submissions/abc.jpg",
        programDescription: "드론 공연 · 체험 부스",
        locations: [{ areaRects: [RECT_A] }],
      },
    );
  });

  it("팝업스토어는 operatingHours만 실린다 (AC 7 — 13439 예방)", () => {
    const request = toCreateRequest({
      ...FESTIVAL_DRAFT,
      type: "POPUP",
      areaRects: [RECT_A],
    });

    expect(request?.operatingHours).toBe("11:00 ~ 20:00");
    expect(request).not.toHaveProperty("programDescription");
    expect(request).not.toHaveProperty("participationMethod");
    expect(request).not.toHaveProperty("parentOccurrenceId");
  });

  it("이벤트는 participationMethod와 parentOccurrenceId만 더 실린다 (AC 7)", () => {
    const request = toCreateRequest({
      ...FESTIVAL_DRAFT,
      type: "EVENT",
      parentOccurrenceId: 412,
      areaRects: [RECT_A],
    });

    expect(request?.participationMethod).toBe("현장 참여 후 영상 업로드");
    expect(request?.parentOccurrenceId).toBe(412);
    expect(request).not.toHaveProperty("programDescription");
    expect(request).not.toHaveProperty("operatingHours");
  });

  it("확정 영역이 없으면 제출 본문을 만들지 않는다 (AC 7)", () => {
    expect(toCreateRequest(FESTIVAL_DRAFT)).toBeNull();
  });

  it("기본 정보 필수값이 비면 제출 본문을 만들지 않는다 (AC 7)", () => {
    expect(
      toCreateRequest({
        ...FESTIVAL_DRAFT,
        areaRects: [RECT_A],
        imageS3Key: null,
      }),
    ).toBeNull();
  });

  it("이벤트인데 소속 이벤트가 없으면 제출 본문을 만들지 않는다 (AC 7)", () => {
    expect(
      toCreateRequest({
        ...FESTIVAL_DRAFT,
        type: "EVENT",
        parentOccurrenceId: null,
        areaRects: [RECT_A],
      }),
    ).toBeNull();
  });
});
