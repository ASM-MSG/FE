import { describe, expect, it } from "vitest";
import {
  submissionHistory,
  submissionLocation,
  SUBMISSION_LOCATIONS,
} from "@/test/org-submission-fixture";
import {
  historyTimeline,
  locationReviewText,
  parseSubmissionId,
  processedAt,
  receivedAt,
  summarizeLocations,
  typeSpecificField,
} from "./submission-detail-view";

describe("parseSubmissionId — 경로 파라미터 숫자 파싱 (MSG-549 AC 10)", () => {
  it("숫자 문자열이면 신청 id로 쓴다 (AC 10)", () => {
    expect(parseSubmissionId("1204")).toBe(1204);
  });

  it("숫자가 아니면 null이라 쿼리가 발사되지 않는다 (AC 10)", () => {
    expect(parseSubmissionId("abc")).toBeNull();
  });

  it("숫자로 시작해도 숫자가 아닌 꼬리가 붙으면 null이다 (AC 10 경계)", () => {
    expect(parseSubmissionId("12abc")).toBeNull();
  });

  it("파라미터가 없거나 0이면 null이다 (AC 10 경계)", () => {
    expect(parseSubmissionId(undefined)).toBeNull();
    expect(parseSubmissionId("0")).toBeNull();
  });

  it("안전 정수 범위를 넘는 숫자열은 null이다 — 반올림된 다른 id로 조회하지 않는다 (AC 10 경계, codex 리뷰)", () => {
    // 전부 숫자라 정규식은 통과하지만 Number()가 값을 반올림한다:
    // 9007199254740993 → 9007199254740992 (다른 신청), 1e400 자리수 → Infinity.
    expect(parseSubmissionId("9007199254740993")).toBeNull();
    expect(parseSubmissionId("9".repeat(400))).toBeNull();
    // 상한 자체는 유효한 id다 (경계 보존)
    expect(parseSubmissionId("9007199254740991")).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("receivedAt·processedAt — 접수·처리 시각 history 파생 (MSG-549 AC 5·6·7, 추정 3)", () => {
  const history = [
    submissionHistory({ changedAt: "2026-09-18T01:24:00" }),
    submissionHistory({ status: "REJECTED", changedAt: "2026-09-19T02:00:00" }),
  ];

  it("접수일은 history 첫 entry의 시각이다 (AC 5, 추정 3)", () => {
    expect(receivedAt(history)).toBe("2026-09-18T01:24:00");
  });

  it("처리일은 history 마지막 전이의 시각이다 (AC 6·7, 추정 3)", () => {
    expect(processedAt(history)).toBe("2026-09-19T02:00:00");
  });

  it("제출 1건뿐이면 처리일이 없다 — 해당 필드는 생략된다 (추정 3)", () => {
    expect(processedAt([history[0]])).toBeNull();
  });

  it("history가 비면 접수일·처리일 모두 없다 (경계)", () => {
    expect(receivedAt([])).toBeNull();
    expect(processedAt([])).toBeNull();
  });
});

describe("historyTimeline — 신청 이력 라벨 (MSG-549 AC 9, 추정 8)", () => {
  it("첫 심사 중은 제출, 두 번째부터는 재제출이고 반려·승인은 그 라벨이다 (AC 9, 추정 8)", () => {
    const timeline = historyTimeline([
      submissionHistory({ changedAt: "2026-09-01T01:00:00" }),
      submissionHistory({
        status: "REJECTED",
        changedAt: "2026-09-02T01:00:00",
      }),
      submissionHistory({ changedAt: "2026-09-03T01:00:00" }),
      submissionHistory({
        status: "APPROVED",
        changedAt: "2026-09-04T01:00:00",
      }),
    ]);

    expect(timeline.map((step) => step.label)).toEqual([
      "제출",
      "반려",
      "재제출",
      "승인",
    ]);
    expect(timeline[0].changedAt).toBe("2026-09-01T01:00:00");
  });

  it("미지 상태는 원문 라벨로 남아 이력 줄이 깨지지 않는다 (AC 11 경계)", () => {
    expect(
      historyTimeline([submissionHistory({ status: "ON_HOLD" })]).map(
        (step) => step.label,
      ),
    ).toEqual(["ON_HOLD"]);
  });

  it("history가 비면 빈 이력이다 (경계)", () => {
    expect(historyTimeline([])).toEqual([]);
  });
});

describe("summarizeLocations — 위치 영역 요약 (MSG-549 AC 9)", () => {
  it("위치 수와 칸 수 합계를 한 줄로 요약한다 (AC 9)", () => {
    expect(summarizeLocations(SUBMISSION_LOCATIONS).text).toBe(
      "위치 2곳 · 총 37칸",
    );
  });

  it("표시명은 구역명·칸 이름을 우선하고 구역 밖이면 행정동으로 내려간다 (AC 9)", () => {
    expect(
      summarizeLocations(SUBMISSION_LOCATIONS).items.map((item) => item.name),
    ).toEqual(["서면 상권 B-7", "부산진구 전포동"]);
  });

  it("구역·행정동이 모두 없으면 대표 격자 id로 폴백한다 (AC 9 경계)", () => {
    const summary = summarizeLocations([
      submissionLocation({
        zoneName: null,
        zoneCell: null,
        regionName: null,
        representativeGridId: "39064_112221",
      }),
    ]);

    expect(summary.items[0].name).toBe("39064_112221");
  });

  it("위치가 없으면 0곳·0칸 요약과 빈 목록이다 (경계)", () => {
    expect(summarizeLocations([])).toEqual({
      text: "위치 0곳 · 총 0칸",
      items: [],
    });
  });
});

describe("typeSpecificField — 유형 전용 필드 1개 (MSG-549 AC 9)", () => {
  const empty = {
    operatingHours: null,
    programDescription: null,
    participationMethod: null,
  };

  it("값이 있는 유형 전용 필드 하나를 라벨과 함께 돌려준다 (AC 9)", () => {
    expect(
      typeSpecificField({ ...empty, programDescription: "드론 라이트쇼" }),
    ).toEqual({ label: "주요 프로그램", value: "드론 라이트쇼" });
    expect(
      typeSpecificField({ ...empty, operatingHours: "11:00~20:00" }),
    ).toEqual({ label: "운영 시간", value: "11:00~20:00" });
    expect(
      typeSpecificField({ ...empty, participationMethod: "현장 접수" }),
    ).toEqual({ label: "참여 방식", value: "현장 접수" });
  });

  it("유형 전용 값이 모두 없으면 필드를 렌더하지 않는다 (AC 9 경계)", () => {
    expect(typeSpecificField(empty)).toBeNull();
  });
});

describe("locationReviewText — 반려 상세의 위치 검토 (MSG-549 AC 7, 추정 7)", () => {
  it("반려 항목에 AREA가 없으면 '문제 없음' 접두가 붙는다 (추정 7)", () => {
    expect(locationReviewText(SUBMISSION_LOCATIONS, ["PERIOD"])).toBe(
      "문제 없음 · 2곳 · 총 37칸",
    );
  });

  it("반려 항목에 AREA가 있으면 '수정 필요' 접두가 붙는다 (추정 7)", () => {
    expect(locationReviewText(SUBMISSION_LOCATIONS, ["AREA", "IMAGE"])).toBe(
      "수정 필요 · 2곳 · 총 37칸",
    );
  });
});
