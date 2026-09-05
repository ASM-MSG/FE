import { describe, expect, it } from "vitest";
import {
  rejectedEditableDetail,
  submissionDetail,
  submissionLocation,
} from "@/test/org-submission-fixture";
import { areaRect, FESTIVAL_DRAFT } from "@/test/submission-draft-fixture";
import {
  hasDraftChanged,
  hydrationFromDetail,
  toUpdateRequest,
} from "./submission-edit";

const RECT_A = areaRect(39064, 112221, 39065, 112222);
const RECT_B = areaRect(39070, 112230, 39070, 112230);

/** 서버 이미지를 유지하는 수정 모드 draft — s3Key 없음 + 유지 표식 */
const EDIT_DRAFT = {
  ...FESTIVAL_DRAFT,
  imageS3Key: null,
  imageKept: true,
  areaRects: [RECT_A],
};

describe("hydrationFromDetail — 신청 상세 → 위저드 프리필 (AC 1)", () => {
  it("반려된 지역축제 신청의 공통 5필드·유형 전용 필드·이미지·영역이 프리필 재료가 된다 (AC 1)", () => {
    const result = hydrationFromDetail(
      rejectedEditableDetail({
        title: "서면 야간 드론쇼",
        organizerName: "서면상권활성화협의회",
        startsOn: "2026-09-05",
        endsOn: "2026-09-07",
        description: "서면 일대에서 열리는 야간 드론쇼입니다.",
        programDescription: "드론 라이트쇼 · 거리 버스킹",
      }),
    );

    expect(result).toEqual({
      ok: {
        submissionId: 12,
        type: "FESTIVAL",
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
      },
    });
  });

  it("팝업스토어는 운영 시간이 유형 전용 값으로 프리필된다 (AC 1)", () => {
    const result = hydrationFromDetail(
      rejectedEditableDetail({
        type: "POPUP",
        programDescription: null,
        operatingHours: "11:00 ~ 20:00",
      }),
    );

    expect(result).toMatchObject({
      ok: { type: "POPUP", typeFieldValue: "11:00 ~ 20:00" },
    });
  });

  it("이벤트는 참여 방식과 소속 이벤트가 표시 전용으로 프리필된다 (AC 1·2 — 추정 8)", () => {
    const result = hydrationFromDetail(
      rejectedEditableDetail({
        type: "EVENT",
        programDescription: null,
        participationMethod: "현장 참여 후 영상 업로드",
        parentEvent: { occurrenceId: 412, name: "포켓몬 메가페스타 부산" },
      }),
    );

    expect(result).toMatchObject({
      ok: {
        type: "EVENT",
        typeFieldValue: "현장 참여 후 영상 업로드",
        parentOccurrence: { occurrenceId: 412, name: "포켓몬 메가페스타 부산" },
      },
    });
  });

  it("위치가 2곳 이상이면 첫 위치(order 최소)만 프리필하고 소실을 알린다 (승인 확정)", () => {
    const result = hydrationFromDetail(
      rejectedEditableDetail({
        locations: [
          submissionLocation({ order: 2, areaRects: [RECT_B] }),
          submissionLocation({ order: 1, areaRects: [RECT_A] }),
        ],
      }),
    );

    expect(result).toMatchObject({
      ok: { areaRects: [RECT_A], droppedLocations: true },
    });
  });

  it("위치가 없는 신청은 빈 영역으로 프리필된다 (경계)", () => {
    const result = hydrationFromDetail(
      rejectedEditableDetail({ locations: [] }),
    );

    expect(result).toMatchObject({
      ok: { areaRects: [], droppedLocations: false },
    });
  });

  it("반려가 아닌 신청은 수정 대상이 아니다 (AC 8)", () => {
    expect(hydrationFromDetail(submissionDetail())).toEqual({
      blocked: "not-rejected",
    });
    expect(
      hydrationFromDetail(submissionDetail({ status: "APPROVED" })),
    ).toEqual({ blocked: "not-rejected" });
    expect(
      hydrationFromDetail(submissionDetail({ status: "ARCHIVED" })),
    ).toEqual({ blocked: "not-rejected" });
  });

  it("유형이 3종 밖인 신청은 폼 설정이 없어 수정 대상이 아니다 (AC 8 — 추정 6)", () => {
    expect(
      hydrationFromDetail(rejectedEditableDetail({ type: "MARKET" })),
    ).toEqual({ blocked: "unknown-type" });
  });
});

describe("toUpdateRequest — 재제출 본문 조립 (AC 5)", () => {
  it("유형·부모 이벤트는 싣지 않고 유형 전용 필드 하나와 위치를 통째로 싣는다 (AC 5)", () => {
    expect(toUpdateRequest(EDIT_DRAFT)).toEqual({
      title: "광안리 M 드론쇼",
      organizerName: "부산광역시 관광마이스과",
      startsOn: "2026-09-05",
      endsOn: "2026-09-07",
      description: "광안리 해변의 밤하늘을 수놓는 정기 드론 공연입니다.",
      programDescription: "드론 공연 · 체험 부스",
      locations: [{ areaRects: [RECT_A] }],
    });
  });

  it("이벤트도 parentOccurrenceId를 싣지 않는다 — 서버 계약에 필드가 없다 (AC 5)", () => {
    const request = toUpdateRequest({
      ...EDIT_DRAFT,
      type: "EVENT",
      parentOccurrenceId: 412,
    });

    expect(request?.participationMethod).toBe("현장 참여 후 영상 업로드");
    expect(request).not.toHaveProperty("parentOccurrenceId");
    expect(request).not.toHaveProperty("type");
    expect(request).not.toHaveProperty("programDescription");
  });

  it("기존 이미지를 유지하면 imageS3Key를 생략한다 — 서버가 기존 이미지를 유지한다 (AC 5)", () => {
    expect(toUpdateRequest(EDIT_DRAFT)).not.toHaveProperty("imageS3Key");
  });

  it("새 이미지를 올렸으면 그 pending 키가 실린다 (AC 5)", () => {
    const request = toUpdateRequest({
      ...EDIT_DRAFT,
      imageS3Key: "pending/submissions/new.jpg",
    });

    expect(request?.imageS3Key).toBe("pending/submissions/new.jpg");
  });

  it("확정 영역이 없으면 재제출 본문을 만들지 않는다 (AC 5)", () => {
    expect(toUpdateRequest({ ...EDIT_DRAFT, areaRects: [] })).toBeNull();
  });

  it("기본 정보 필수값이 비면 재제출 본문을 만들지 않는다 (AC 5)", () => {
    expect(
      toUpdateRequest({
        ...EDIT_DRAFT,
        common: { ...EDIT_DRAFT.common, title: "" },
      }),
    ).toBeNull();
  });
});

describe("hasDraftChanged — hydrate 스냅숏 대비 변경 판정 (AC 9)", () => {
  it("프리필 직후 그대로면 변경이 없다 (AC 9)", () => {
    expect(hasDraftChanged(EDIT_DRAFT, { ...EDIT_DRAFT })).toBe(false);
  });

  it("공통 입력을 고치면 변경이다 (AC 9)", () => {
    expect(
      hasDraftChanged(EDIT_DRAFT, {
        ...EDIT_DRAFT,
        common: { ...EDIT_DRAFT.common, title: "광안리 M 드론쇼 2회차" },
      }),
    ).toBe(true);
  });

  it("유형 전용 필드를 고치면 변경이다 (AC 9)", () => {
    expect(
      hasDraftChanged(EDIT_DRAFT, {
        ...EDIT_DRAFT,
        typeFieldValues: {
          ...EDIT_DRAFT.typeFieldValues,
          FESTIVAL: "드론 공연만",
        },
      }),
    ).toBe(true);
  });

  it("새 이미지를 올리면 변경이다 (AC 9)", () => {
    expect(
      hasDraftChanged(EDIT_DRAFT, {
        ...EDIT_DRAFT,
        imageS3Key: "pending/submissions/new.jpg",
        imageKept: false,
      }),
    ).toBe(true);
  });

  it("영역을 더하거나 지우면 변경이다 (AC 9)", () => {
    expect(
      hasDraftChanged(EDIT_DRAFT, {
        ...EDIT_DRAFT,
        areaRects: [RECT_A, RECT_B],
      }),
    ).toBe(true);
    expect(hasDraftChanged(EDIT_DRAFT, { ...EDIT_DRAFT, areaRects: [] })).toBe(
      true,
    );
  });

  it("영역을 같은 값으로 다시 그리면 변경이 아니다 — 키 순서가 다른 서버 원본도 같다 (AC 9)", () => {
    const serverShaped = {
      minGridY: RECT_A.minGridY,
      maxGridY: RECT_A.maxGridY,
      minGridX: RECT_A.minGridX,
      maxGridX: RECT_A.maxGridX,
    };

    expect(
      hasDraftChanged(EDIT_DRAFT, { ...EDIT_DRAFT, areaRects: [serverShaped] }),
    ).toBe(false);
  });
});
