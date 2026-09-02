import { describe, expect, it } from "vitest";
import type { EventSubmissionLocationResponseDto } from "@/shared/api/generated/types.gen";
import {
  formatLocationCountLabel,
  resolveSelectedId,
  formatPreviewAreaSummary,
  formatPreviewPeriod,
  formatScheduleLabel,
  submissionStatusView,
  submissionTypeLabel,
} from "./submission-view";

const location = (
  cellCount: number,
  rectCount: number,
): EventSubmissionLocationResponseDto => ({
  order: 1,
  representativeGridId: "39064_112221",
  zoneName: "광안리",
  zoneCell: "B-7",
  regionName: "수영구 광안동",
  cellCount,
  areaRects: Array.from({ length: rectCount }, () => ({
    minGridY: 0,
    maxGridY: 1,
    minGridX: 0,
    maxGridX: 1,
  })),
});

describe("formatScheduleLabel — 목록 일정 라벨 (AC 2-a)", () => {
  it("시작일과 종료일이 다르면 'M.D–M.D'로 표기한다 (AC 2-a)", () => {
    expect(formatScheduleLabel("2026-09-05", "2026-09-07")).toBe("9.5–9.7");
  });

  it("하루 행사(시작일=종료일)는 'M.D' 하나로 표기한다 (AC 2-a, 경계)", () => {
    expect(formatScheduleLabel("2026-09-12", "2026-09-12")).toBe("9.12");
  });
});

describe("formatLocationCountLabel — 목록 위치 요약 (AC 2-b)", () => {
  it("위치 수를 '위치 {n}곳'으로 표기한다 (AC 2-b)", () => {
    expect(formatLocationCountLabel(3)).toBe("위치 3곳");
    expect(formatLocationCountLabel(1)).toBe("위치 1곳");
  });
});

describe("formatPreviewPeriod — 미리보기 기간 (AC 2-c)", () => {
  it("기간이 있으면 '연. M. D – M. D'로 표기한다 (AC 2-c)", () => {
    expect(formatPreviewPeriod("2026-09-05", "2026-09-07")).toBe(
      "2026. 9. 5 – 9. 7",
    );
  });

  it("하루 행사는 '연. M. D' 하나로 표기한다 (AC 2-c, 경계)", () => {
    expect(formatPreviewPeriod("2026-09-12", "2026-09-12")).toBe("2026. 9. 12");
  });
});

describe("formatPreviewAreaSummary — 미리보기 위치 요약 (AC 2-d)", () => {
  it("위치 수·사각형 합·칸 수 합을 '{n}곳 · 사각형 {n}개 · 총 {n}칸'으로 합산한다 (AC 2-d)", () => {
    const locations = [location(20, 2), location(10, 1), location(7, 1)];

    expect(formatPreviewAreaSummary(locations)).toBe(
      "3곳 · 사각형 4개 · 총 37칸",
    );
  });

  it("위치가 없으면 0으로 합산한다 (AC 2-d, 경계)", () => {
    expect(formatPreviewAreaSummary([])).toBe("0곳 · 사각형 0개 · 총 0칸");
  });
});

describe("submissionTypeLabel — 등록 유형 라벨 (AC 2-e, 추정 5)", () => {
  it("FESTIVAL·POPUP·EVENT를 생성 스키마 주석의 한국어 라벨로 매핑한다 (AC 2-e)", () => {
    expect(submissionTypeLabel("FESTIVAL")).toBe("지역축제");
    expect(submissionTypeLabel("POPUP")).toBe("팝업스토어");
    expect(submissionTypeLabel("EVENT")).toBe("이벤트 참여형");
  });

  it("상세 응답의 type은 열린 문자열이라 미지 값은 null이다 — 라벨 미표시 신호 (AC 2-e, 경계)", () => {
    expect(submissionTypeLabel("UNKNOWN_TYPE")).toBeNull();
  });
});

describe("submissionStatusView — 신청 상태 라벨·톤 (AC 2-f, 추정 7)", () => {
  it("심사 중은 warning 톤이다 (AC 2-f)", () => {
    expect(submissionStatusView("IN_REVIEW")).toEqual({
      label: "심사 중",
      tone: "warning",
    });
  });

  it("승인됨은 success 톤이다 (AC 2-f)", () => {
    expect(submissionStatusView("APPROVED")).toEqual({
      label: "승인됨",
      tone: "success",
    });
  });

  it("반려됨은 error 톤이다 (AC 2-f)", () => {
    expect(submissionStatusView("REJECTED")).toEqual({
      label: "반려됨",
      tone: "error",
    });
  });
});

describe("resolveSelectedId — 선택 id 파생 (AC 8 + codex P2: 고정 행 이탈 폴백)", () => {
  it("고정한 id가 현재 목록에 있으면 그대로 선택한다", () => {
    expect(resolveSelectedId(2, [{ id: 1 }, { id: 2 }])).toBe(2);
  });

  it("고정한 id가 재조회로 목록에서 빠지면 첫 행으로 폴백한다", () => {
    expect(resolveSelectedId(9, [{ id: 1 }, { id: 2 }])).toBe(1);
  });

  it("고정이 없으면 첫 행, 목록이 비면 null이다", () => {
    expect(resolveSelectedId(null, [{ id: 3 }])).toBe(3);
    expect(resolveSelectedId(null, [])).toBeNull();
    expect(resolveSelectedId(9, [])).toBeNull();
  });
});
