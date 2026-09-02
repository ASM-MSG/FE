import { describe, expect, it } from "vitest";
import { cellIndexAt, distanceMeters } from "@/entities/cell";
import { ApiError } from "@/shared/api/api-error";
import {
  APPROVED_EVENT_TAB_ORDER,
  EMAIL_FAILED_NOTICE,
  approvedDateLabel,
  approvedEventTabText,
  approvedEventTabViews,
  canSubmitUnpublish,
  eventStatusBadge,
  exposureCenter,
  exposureSummary,
  formatCardDate,
  formatCardPeriod,
  formatRowPeriod,
  unpublishFailureNotice,
} from "./approved-event";

/** MVP 지역 기준점 — 서면 (mock·좌표 정본) */
const SEOMYEON = { lat: 35.1579, lng: 129.0594 };

const COUNTS = { exposedCount: 12, upcomingCount: 4, endedCount: 31 };

describe("approvedEventTabViews — 상태 탭 3종과 카운트 표기 (AC 1·2)", () => {
  it("응답 카운트로 '노출 중 n · 예정 n · 종료 n' 라벨을 만든다 (AC 1)", () => {
    const views = approvedEventTabViews(COUNTS);

    expect(views.map((view) => view.label)).toEqual([
      "노출 중 12",
      "예정 4",
      "종료 31",
    ]);
  });

  it("카운트가 아직 없으면(로딩·실패) 이름만 남긴다 (경계)", () => {
    const views = approvedEventTabViews(null);

    expect(views.map((view) => view.label)).toEqual([
      "노출 중",
      "예정",
      "종료",
    ]);
  });

  it("탭마다 목록 카드 제목이 탭을 반영한다 (AC 2)", () => {
    const views = approvedEventTabViews(COUNTS);

    expect(views.map((view) => view.listTitle)).toEqual([
      "노출 중 행사",
      "예정 행사",
      "종료 행사",
    ]);
  });

  it("탭 순서는 노출 중 → 예정 → 종료다 (AC 1)", () => {
    expect(APPROVED_EVENT_TAB_ORDER).toEqual(["EXPOSED", "UPCOMING", "ENDED"]);
  });

  it("탭마다 빈 목록 안내가 그 탭을 가리킨다 (AC 12)", () => {
    expect(approvedEventTabText("EXPOSED").emptyMessage).toBe(
      "노출 중인 행사가 없습니다.",
    );
    expect(approvedEventTabText("UPCOMING").emptyMessage).toBe(
      "예정된 행사가 없습니다.",
    );
    expect(approvedEventTabText("ENDED").emptyMessage).toBe(
      "종료된 행사가 없습니다.",
    );
  });

  it("탭 텍스트의 목록 제목은 탭 뷰와 같은 정본을 쓴다 (AC 2)", () => {
    expect(approvedEventTabText("UPCOMING").listTitle).toBe("예정 행사");
  });
});

describe("기간 표기 — KST 날짜부 기준 (AC 3·4)", () => {
  it("같은 해 기간은 테이블에서 '9.5–9.7'로 줄인다 (AC 3)", () => {
    expect(formatRowPeriod("2026-09-05", "2026-09-07")).toBe("9.5–9.7");
  });

  it("해가 넘어가면 양쪽에 연도를 붙인다 (경계)", () => {
    expect(formatRowPeriod("2026-12-30", "2027-01-02")).toBe(
      "2026.12.30–2027.1.2",
    );
  });

  it("상세 카드 기간은 '2026. 9. 5 – 9. 7'로 표기한다 (AC 4)", () => {
    expect(formatCardPeriod("2026-09-05", "2026-09-07")).toBe(
      "2026. 9. 5 – 9. 7",
    );
  });

  it("상세 카드 단일 날짜는 '2026. 9. 1'로 표기한다 (AC 11)", () => {
    expect(formatCardDate("2026-09-01T04:30:00Z")).toBe("2026. 9. 1");
  });

  it("UTC 자정 직전 시각은 KST 다음 날로 넘어간다 (경계)", () => {
    expect(formatCardDate("2026-08-31T15:30:00Z")).toBe("2026. 9. 1");
  });
});

describe("eventStatusBadge — 상태 배지 판정 (AC 3)", () => {
  it("파생 상태를 한국어 라벨로 표시한다 (AC 3)", () => {
    expect(eventStatusBadge({ status: "EXPOSED", unpublished: false })).toEqual(
      { label: "노출 중", tone: "exposed" },
    );
    expect(
      eventStatusBadge({ status: "UPCOMING", unpublished: false }),
    ).toEqual({ label: "예정", tone: "upcoming" });
    expect(eventStatusBadge({ status: "ENDED", unpublished: false })).toEqual({
      label: "종료",
      tone: "ended",
    });
  });

  it("중지된 행사는 파생 상태보다 중지 표기가 우선한다 (AC 3)", () => {
    expect(eventStatusBadge({ status: "EXPOSED", unpublished: true })).toEqual({
      label: "노출 중지",
      tone: "unpublished",
    });
  });

  it("알 수 없는 status는 원문을 그대로 라벨로 쓴다 (경계)", () => {
    expect(eventStatusBadge({ status: "DRAFT", unpublished: false })).toEqual({
      label: "DRAFT",
      tone: "ended",
    });
  });
});

describe("approvedDateLabel — 승인일 파생 (AC 4)", () => {
  it("history의 APPROVED 전이 시각에서 '9.19'를 뽑는다 (AC 4)", () => {
    const label = approvedDateLabel([
      { status: "SUBMITTED", changedAt: "2026-09-17T02:00:00Z" },
      { status: "APPROVED", changedAt: "2026-09-19T02:00:00Z" },
    ]);

    expect(label).toBe("9.19");
  });

  it("APPROVED 전이가 여럿이면 마지막 것을 쓴다 (경계)", () => {
    const label = approvedDateLabel([
      { status: "APPROVED", changedAt: "2026-09-10T02:00:00Z" },
      { status: "REJECTED", changedAt: "2026-09-12T02:00:00Z" },
      { status: "APPROVED", changedAt: "2026-09-19T02:00:00Z" },
    ]);

    expect(label).toBe("9.19");
  });

  it("APPROVED 전이가 없으면 null이다 (경계)", () => {
    expect(
      approvedDateLabel([
        { status: "SUBMITTED", changedAt: "2026-09-17T02:00:00Z" },
      ]),
    ).toBeNull();
  });
});

describe("exposureSummary — 노출 범위 요약 파생 (AC 5)", () => {
  it("locations에서 'n곳 · 사각형 n개 · 총 n칸'을 만든다 (AC 5)", () => {
    const summary = exposureSummary([
      { cellCount: 20, areaRects: [rect(0), rect(1)] },
      { cellCount: 9, areaRects: [rect(2)] },
      { cellCount: 8, areaRects: [rect(3)] },
    ]);

    expect(summary).toBe("3곳 · 사각형 4개 · 총 37칸");
  });

  it("위치가 없으면 0으로 수렴한다 (경계)", () => {
    expect(exposureSummary([])).toBe("0곳 · 사각형 0개 · 총 0칸");
  });
});

describe("exposureCenter — 노출 사각형 중심 좌표 (AC 6)", () => {
  it("사각형 중심 격자의 좌표를 돌려준다 (AC 6)", () => {
    const origin = cellIndexAt(SEOMYEON);

    const center = exposureCenter({
      minGridX: origin.gridX - 2,
      maxGridX: origin.gridX + 2,
      minGridY: origin.gridY - 2,
      maxGridY: origin.gridY + 2,
    });

    // 5×5칸(500m) 정중앙 격자라 기준점과 한 칸(100m) 안쪽에서 만난다
    expect(distanceMeters(center, SEOMYEON)).toBeLessThan(150);
  });

  it("사각형이 동쪽으로 밀리면 중심 경도도 동쪽으로 간다 (경계)", () => {
    const origin = cellIndexAt(SEOMYEON);
    const base = {
      minGridX: origin.gridX,
      maxGridX: origin.gridX + 2,
      minGridY: origin.gridY,
      maxGridY: origin.gridY + 2,
    };

    const shifted = exposureCenter({
      ...base,
      minGridX: base.minGridX + 10,
      maxGridX: base.maxGridX + 10,
    });

    expect(shifted.lng).toBeGreaterThan(exposureCenter(base).lng);
  });
});

describe("canSubmitUnpublish — 사유 필수 검증 (AC 7)", () => {
  it("사유가 있으면 확정할 수 있다 (AC 7)", () => {
    expect(canSubmitUnpublish("행사 정보가 사실과 다릅니다")).toBe(true);
  });

  it("빈 문자열·공백뿐인 사유는 확정할 수 없다 (AC 7)", () => {
    expect(canSubmitUnpublish("")).toBe(false);
    expect(canSubmitUnpublish("   \n ")).toBe(false);
  });
});

describe("unpublishFailureNotice — 중지 실패 안내 분기 (AC 9)", () => {
  it("409(13453)는 이미 중지된 행사로 구분하고 목록 재조회를 유도한다 (AC 9)", () => {
    const notice = unpublishFailureNotice(
      new ApiError("이미 중지된 행사입니다", {
        status: 409,
        developCode: 13453,
      }),
    );

    expect(notice.alreadyUnpublished).toBe(true);
    expect(notice.staleServerState).toBe(true);
    expect(notice.message).toContain("이미 중지");
  });

  it("404(13430)는 대상 없음 안내다 (AC 9)", () => {
    const notice = unpublishFailureNotice(
      new ApiError("승인 행사가 아닙니다", {
        status: 404,
        developCode: 13430,
      }),
    );

    expect(notice.alreadyUnpublished).toBe(false);
    expect(notice.staleServerState).toBe(true);
    expect(notice.message).toContain("찾을 수 없");
  });

  it("그 외 실패는 재시도 안내로 수렴한다 (AC 9)", () => {
    const notice = unpublishFailureNotice(new Error("network down"));

    expect(notice.alreadyUnpublished).toBe(false);
    expect(notice.staleServerState).toBe(false);
    expect(notice.message).toContain("다시 시도");
  });

  it("메일 발송 실패 안내는 중지가 유지됨을 함께 알린다 (AC 10)", () => {
    expect(EMAIL_FAILED_NOTICE).toContain("유지");
  });
});

/** 사각형 1개 — 개수만 세는 파생이라 인덱스 값은 의미가 없다 */
const rect = (offset: number) => ({
  minGridX: offset,
  maxGridX: offset,
  minGridY: offset,
  maxGridY: offset,
});
