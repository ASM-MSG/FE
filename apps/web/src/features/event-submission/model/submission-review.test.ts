import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/api/api-error";
// 완전 입력 draft·사각형 헬퍼는 조립 테스트(submission-form)와 공유한다 (중복 게이트 검출)
import { areaRect, FESTIVAL_DRAFT } from "@/test/submission-draft-fixture";
import { SUBMISSION_FORM_CONFIGS } from "./submission-form";
import {
  readSubmittedNo,
  reviewAreaSummary,
  reviewBasicRows,
  reviewPeriodLabel,
  submissionReceiptToast,
  submitFailureNotice,
  SUBMIT_RETRY_MESSAGE,
} from "./submission-review";

describe("reviewPeriodLabel — 검토 카드의 기간 표기 (AC 2)", () => {
  it("양쪽 연도를 유지한 '2026. 9. 5 – 2026. 9. 7' 꼴로 옮긴다 (AC 2)", () => {
    expect(reviewPeriodLabel("2026-09-05", "2026-09-07")).toBe(
      "2026. 9. 5 – 2026. 9. 7",
    );
  });

  it("두 자리 월·일의 앞자리 0을 떼고 표기한다 (AC 2)", () => {
    expect(reviewPeriodLabel("2026-11-15", "2026-12-03")).toBe(
      "2026. 11. 15 – 2026. 12. 3",
    );
  });

  it("연도가 다르면 양쪽 연도가 그대로 남는다 (경계)", () => {
    expect(reviewPeriodLabel("2026-12-30", "2027-01-02")).toBe(
      "2026. 12. 30 – 2027. 1. 2",
    );
  });

  it("하루 행사는 같은 날짜가 양쪽에 표기된다 (경계)", () => {
    expect(reviewPeriodLabel("2026-09-05", "2026-09-05")).toBe(
      "2026. 9. 5 – 2026. 9. 5",
    );
  });
});

describe("reviewBasicRows — 기본 정보 카드 필드 행 파생 (AC 2)", () => {
  it("지역축제는 SUBMISSION_FORM_CONFIGS 라벨 4종을 스토어 값과 짝지어 돌려준다 (AC 2)", () => {
    const rows = reviewBasicRows(
      FESTIVAL_DRAFT,
      SUBMISSION_FORM_CONFIGS.FESTIVAL,
      null,
    );

    expect(rows.map((row) => row.label)).toEqual([
      "주최 기관",
      "축제 기간",
      "주요 프로그램",
      "축제 소개",
    ]);
    expect(rows.map((row) => row.value)).toEqual([
      "부산광역시 관광마이스과",
      "2026. 9. 5 – 2026. 9. 7",
      "드론 공연 · 체험 부스",
      "광안리 해변의 밤하늘을 수놓는 정기 드론 공연입니다.",
    ]);
  });

  it("팝업스토어는 유형별 라벨(브랜드 / 운영사·운영 기간·운영 시간)로 갈린다 (AC 2)", () => {
    const rows = reviewBasicRows(
      { ...FESTIVAL_DRAFT, type: "POPUP" },
      SUBMISSION_FORM_CONFIGS.POPUP,
      null,
    );

    expect(rows.map((row) => row.label)).toEqual([
      "브랜드 / 운영사",
      "운영 기간",
      "운영 시간",
      "팝업 소개",
    ]);
    expect(rows[2].value).toBe("11:00 ~ 20:00");
  });

  it("이벤트는 소속 이벤트 행이 추가된다 (AC 2 — 추정 3)", () => {
    const rows = reviewBasicRows(
      { ...FESTIVAL_DRAFT, type: "EVENT", parentOccurrenceId: 412 },
      SUBMISSION_FORM_CONFIGS.EVENT,
      "포켓몬 메가페스타 부산",
    );

    expect(rows.find((row) => row.label === "소속 이벤트")?.value).toBe(
      "포켓몬 메가페스타 부산",
    );
    expect(rows.map((row) => row.value)).toContain("현장 참여 후 영상 업로드");
  });

  it("이벤트가 아니면 소속 이벤트 행이 없다 (AC 2)", () => {
    const rows = reviewBasicRows(
      FESTIVAL_DRAFT,
      SUBMISSION_FORM_CONFIGS.FESTIVAL,
      "포켓몬 메가페스타 부산",
    );

    expect(rows.some((row) => row.label === "소속 이벤트")).toBe(false);
  });

  it("소개는 전폭 행이고 주최·기간은 2열 행이다 (AC 1 — 시안 배치)", () => {
    const rows = reviewBasicRows(
      FESTIVAL_DRAFT,
      SUBMISSION_FORM_CONFIGS.FESTIVAL,
      null,
    );

    expect(rows.map((row) => row.fullWidth)).toEqual([
      false,
      false,
      true,
      true,
    ]);
  });

  it("유형이 없으면 행이 없다 (경계)", () => {
    expect(
      reviewBasicRows(
        { ...FESTIVAL_DRAFT, type: null },
        SUBMISSION_FORM_CONFIGS.FESTIVAL,
        null,
      ),
    ).toEqual([]);
  });
});

describe("reviewAreaSummary — 위치 영역 카드 요약 (AC 3)", () => {
  it("겹친 사각형의 총 칸수는 합집합으로 센다 (AC 3)", () => {
    // 2×2 두 개가 한 칸 겹침 — 단순 합 8이 아니라 합집합 7
    const summary = reviewAreaSummary([
      areaRect(0, 0, 1, 1),
      areaRect(1, 1, 2, 2),
    ]);

    expect(summary.cellLabel).toBe("총 7칸");
    expect(summary.countLabel).toBe("1곳 · 사각형 2개");
  });

  it("사각형 행 목록은 areaRowLabel 표기를 따른다 (AC 3)", () => {
    const summary = reviewAreaSummary([
      areaRect(0, 0, 2, 1),
      areaRect(5, 5, 5, 5),
    ]);

    expect(summary.rowLabels).toEqual([
      "영역 1 · 가로 3 × 세로 2 · 6칸",
      "영역 2 · 가로 1 × 세로 1 · 1칸",
    ]);
  });

  it("영역이 없으면 0곳·0칸이고 행 목록이 빈다 (경계)", () => {
    const summary = reviewAreaSummary([]);

    expect(summary.countLabel).toBe("0곳 · 사각형 0개");
    expect(summary.cellLabel).toBe("총 0칸");
    expect(summary.rowLabels).toEqual([]);
  });
});

describe("submitFailureNotice — 제출 실패 안내 분기 (AC 11)", () => {
  it("13433은 기간 문제를 알리고 기본 정보 수정을 유도한다 (AC 11)", () => {
    const message = submitFailureNotice(
      new ApiError("종료일이 오늘 이전입니다", {
        status: 400,
        developCode: 13433,
      }),
    );

    expect(message).toContain("기간");
    expect(message).toContain("기본 정보");
  });

  it("13439·13440·13441은 유형·소속 이벤트 확인을 유도한다 (AC 11)", () => {
    const messages = [13439, 13440, 13441].map((developCode) =>
      submitFailureNotice(
        new ApiError("유형 오류", { status: 400, developCode }),
      ),
    );

    for (const message of messages) {
      expect(message).toContain("유형");
      expect(message).toContain("소속 이벤트");
    }
  });

  it("미등재 developCode는 서버 message를 그대로 안내한다 (AC 11 — 미지 코드 폴백)", () => {
    expect(
      submitFailureNotice(
        new ApiError("위치 영역이 상한을 넘었습니다", {
          status: 400,
          developCode: 13499,
        }),
      ),
    ).toBe("위치 영역이 상한을 넘었습니다");
  });

  it("네트워크 실패(status 없음)는 일반 재시도 문구다 (AC 11)", () => {
    expect(submitFailureNotice(new ApiError("요청에 실패했습니다"))).toBe(
      SUBMIT_RETRY_MESSAGE,
    );
  });

  it("ApiError가 아닌 실패도 일반 재시도 문구로 수렴한다 (경계)", () => {
    expect(submitFailureNotice(new Error("boom"))).toBe(SUBMIT_RETRY_MESSAGE);
    expect(submitFailureNotice(null)).toBe(SUBMIT_RETRY_MESSAGE);
  });
});

describe("readSubmittedNo — 접수 안내 state 판독 (AC 10)", () => {
  it("navigate state의 신청 번호를 꺼낸다 (AC 10)", () => {
    expect(readSubmittedNo({ submittedNo: "FM-2026-0007" })).toBe(
      "FM-2026-0007",
    );
  });

  it("state가 없거나 번호가 없으면 안내하지 않는다 (AC 10 — 직접 방문·새로고침)", () => {
    expect(readSubmittedNo(null)).toBeNull();
    expect(readSubmittedNo(undefined)).toBeNull();
    expect(readSubmittedNo({})).toBeNull();
    expect(readSubmittedNo({ submittedNo: "" })).toBeNull();
    expect(readSubmittedNo({ submittedNo: 1204 })).toBeNull();
  });
});

describe("submissionReceiptToast — 접수 안내 문구 (AC 10)", () => {
  it("신청 번호와 심사 소요를 함께 안내한다 (AC 10)", () => {
    const toast = submissionReceiptToast("FM-2026-0007");

    expect(toast.title).toContain("FM-2026-0007");
    expect(toast.description).toContain("1~2영업일");
  });
});
