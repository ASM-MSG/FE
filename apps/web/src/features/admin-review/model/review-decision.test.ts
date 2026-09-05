import { describe, expect, it } from "vitest";
import type { EventSubmissionLocationResponseDto } from "@/shared/api/generated/types.gen";
import { ApiError } from "@/shared/api/api-error";
import { rectCornersAt } from "@/features/event-submission/model/submission-area";
import {
  canSubmitReject,
  decisionErrorView,
  decisionFailureOf,
  ensureReasonCode,
  exposureBounds,
  isInReview,
  isSubmissionNotFound,
  lastRejection,
  locationLabel,
  locationToneAt,
  parseSubmissionId,
  rectTopCenter,
  REJECT_REASON_ITEMS,
  rejectReasonLabel,
  submissionStatusChip,
  toggleReasonCode,
} from "./review-decision";

/** 서면 실좌표 격자 — 3열 × 3행 */
const RECT_3X3 = {
  minGridX: 11420,
  maxGridX: 11422,
  minGridY: 16858,
  maxGridY: 16860,
};

const location = (
  overrides: Partial<EventSubmissionLocationResponseDto> = {},
): EventSubmissionLocationResponseDto => ({
  order: 1,
  representativeGridId: "11420_16858",
  zoneName: "광안리",
  zoneCell: "B-7",
  regionName: "수영구 광안동",
  cellCount: 12,
  areaRects: [RECT_3X3],
  ...overrides,
});

describe("반려 항목 정의와 토글 (AC 1)", () => {
  it("반려 항목은 서버 허용 코드 4종과 한국어 라벨의 짝으로 고정된다", () => {
    expect(REJECT_REASON_ITEMS).toEqual([
      { code: "PERIOD", label: "행사 기간" },
      { code: "AREA", label: "위치 영역" },
      { code: "IMAGE", label: "홍보 이미지" },
      { code: "INFO", label: "행사 정보" },
    ]);
  });

  it("체크되지 않은 항목을 토글하면 추가된다", () => {
    expect(toggleReasonCode([], "AREA")).toEqual(["AREA"]);
    expect(toggleReasonCode(["PERIOD"], "AREA")).toEqual(["PERIOD", "AREA"]);
  });

  it("이미 체크된 항목을 토글하면 해제되고 중복이 생기지 않는다", () => {
    expect(toggleReasonCode(["PERIOD", "AREA"], "PERIOD")).toEqual(["AREA"]);
    expect(toggleReasonCode(["AREA"], "AREA")).toEqual([]);
    expect(toggleReasonCode(["AREA"], "AREA").length).toBe(0);
  });

  it("코드를 두 번 추가해도 배열에 한 번만 남는다 (서버 중복 불가 계약)", () => {
    const once = toggleReasonCode([], "IMAGE");
    expect(toggleReasonCode(toggleReasonCode(once, "IMAGE"), "IMAGE")).toEqual([
      "IMAGE",
    ]);
  });

  it("항목 코드의 라벨을 되짚을 수 있고 미지 코드는 원문을 돌려준다 (AC 13 반려 결과 표시)", () => {
    expect(rejectReasonLabel("AREA")).toBe("위치 영역");
    expect(rejectReasonLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

describe("항목 강제 체크 (AC 11 — 13452 AREA 유도)", () => {
  it("체크되지 않은 항목을 넣으면 추가된다", () => {
    expect(ensureReasonCode([], "AREA")).toEqual(["AREA"]);
    expect(ensureReasonCode(["PERIOD"], "AREA")).toEqual(["PERIOD", "AREA"]);
  });

  it("이미 체크된 항목은 그대로 둔다 — 토글과 달리 해제되지 않는다", () => {
    expect(ensureReasonCode(["AREA"], "AREA")).toEqual(["AREA"]);
    expect(ensureReasonCode(["AREA", "INFO"], "AREA")).toEqual([
      "AREA",
      "INFO",
    ]);
  });
});

describe("상세 상태 표기 (AC 5·13)", () => {
  it("정본 3종은 552의 상태 칩 정본(라벨·톤)을 그대로 쓴다 — IN_REVIEW는 '심사 중'", () => {
    expect(submissionStatusChip("IN_REVIEW")).toEqual({
      label: "심사 중",
      tone: "warning",
    });
    expect(submissionStatusChip("APPROVED")?.label).toBe("승인됨");
    expect(submissionStatusChip("REJECTED")?.label).toBe("반려됨");
  });

  it("상세 응답 status는 열린 문자열이라 미지 값은 칩을 만들지 않는다", () => {
    expect(submissionStatusChip("DRAFT")).toBeNull();
  });

  it("심사 중일 때만 확정 조작 대상이다 (AC 13)", () => {
    expect(isInReview("IN_REVIEW")).toBe(true);
    expect(isInReview("APPROVED")).toBe(false);
    expect(isInReview("REJECTED")).toBe(false);
  });
});

describe("반려 결과 재료 (AC 13) — 관리자 상세 DTO에 rejection 필드가 없다", () => {
  const historyRow = (
    status: string,
    reasonCodes: string[] | null = null,
    reasonText: string | null = null,
  ) => ({ status, reasonCodes, reasonText, changedAt: "2026-09-03T05:00:00Z" });

  it("반려 이력의 항목·사유를 꺼낸다", () => {
    expect(
      lastRejection([
        historyRow("IN_REVIEW"),
        historyRow("REJECTED", ["PERIOD", "IMAGE"], "기간·이미지 문제"),
      ]),
    ).toEqual({
      reasonCodes: ["PERIOD", "IMAGE"],
      reasonText: "기간·이미지 문제",
    });
  });

  it("반려가 여러 번이면 마지막 반려를 쓴다 — 재신청 이력이 쌓인다", () => {
    expect(
      lastRejection([
        historyRow("REJECTED", ["INFO"], "첫 반려"),
        historyRow("IN_REVIEW"),
        historyRow("REJECTED", ["AREA"], "두 번째 반려"),
      ])?.reasonText,
    ).toBe("두 번째 반려");
  });

  it("반려 이력이 없으면 null이다", () => {
    expect(lastRejection([])).toBeNull();
    expect(lastRejection([historyRow("APPROVED")])).toBeNull();
  });
});

describe("반려 제출 가능 판정 (AC 1·9)", () => {
  it("항목 1개 이상 AND 사유 비공백일 때만 제출 가능하다", () => {
    expect(canSubmitReject(["AREA"], "겹칩니다")).toBe(true);
  });

  it("항목이 비어 있으면 사유가 있어도 제출 불가", () => {
    expect(canSubmitReject([], "겹칩니다")).toBe(false);
  });

  it("사유가 없거나 공백뿐이면 제출 불가", () => {
    expect(canSubmitReject(["AREA"], "")).toBe(false);
    expect(canSubmitReject(["AREA"], "   \n ")).toBe(false);
  });
});

describe("위치 라벨 폴백 체인 (AC 2-a)", () => {
  it("구역명과 구역 칸이 있으면 '{구역명} {칸} · {n}칸'", () => {
    expect(locationLabel(location())).toBe("광안리 B-7 · 12칸");
  });

  it("구역 칸이 없으면 구역명만 쓴다", () => {
    expect(locationLabel(location({ zoneCell: null }))).toBe("광안리 · 12칸");
  });

  it("구역 밖이면 행정동 이름으로 내려간다", () => {
    expect(
      locationLabel(location({ zoneName: null, zoneCell: null, cellCount: 9 })),
    ).toBe("수영구 광안동 · 9칸");
  });

  it("구역·행정동 모두 없으면 순번 폴백 '위치 {order}'", () => {
    expect(
      locationLabel(
        location({
          zoneName: null,
          zoneCell: null,
          regionName: null,
          order: 3,
          cellCount: 16,
        }),
      ),
    ).toBe("위치 3 · 16칸");
  });
});

describe("위치별 색 순환 (AC 2-b)", () => {
  it("인덱스 0·1·2가 서로 다른 토큰 톤 3색으로 갈린다", () => {
    expect([locationToneAt(0), locationToneAt(1), locationToneAt(2)]).toEqual([
      "primary",
      "accent",
      "warning",
    ]);
  });

  it("네 번째부터는 처음 톤으로 되돌아 순환한다 (위치 수 제한 없음)", () => {
    expect(locationToneAt(3)).toBe(locationToneAt(0));
    expect(locationToneAt(19)).toBe(locationToneAt(1));
  });
});

describe("노출 범위 카메라 경계 파생 (AC 2-c·6)", () => {
  it("사각형 꼭짓점 전체를 감싸는 남서·북동 경계를 만든다", () => {
    const bounds = exposureBounds(RECT_3X3);
    const corners = rectCornersAt(RECT_3X3);

    expect(bounds.sw.lat).toBeLessThan(bounds.ne.lat);
    expect(bounds.sw.lng).toBeLessThan(bounds.ne.lng);
    corners.forEach((corner) => {
      expect(corner.lat).toBeGreaterThanOrEqual(bounds.sw.lat);
      expect(corner.lat).toBeLessThanOrEqual(bounds.ne.lat);
      expect(corner.lng).toBeGreaterThanOrEqual(bounds.sw.lng);
      expect(corner.lng).toBeLessThanOrEqual(bounds.ne.lng);
    });
  });

  it("경계 크기가 격자 칸 수에 맞는다 — 3행이면 위도 폭 약 300m(0.0027°)", () => {
    const bounds = exposureBounds(RECT_3X3);

    expect(bounds.ne.lat - bounds.sw.lat).toBeGreaterThan(0.002);
    expect(bounds.ne.lat - bounds.sw.lat).toBeLessThan(0.004);
  });
});

describe("라벨 앵커 파생 (AC 6 라벨 캡슐)", () => {
  it("사각형 북쪽 변의 가운데를 가리킨다", () => {
    const anchor = rectTopCenter(RECT_3X3);
    const bounds = exposureBounds(RECT_3X3);
    const midLng = (bounds.sw.lng + bounds.ne.lng) / 2;

    expect(anchor.lat).toBeCloseTo(bounds.ne.lat, 4);
    expect(anchor.lng).toBeCloseTo(midLng, 3);
  });
});

describe("승인·반려 실패 분기 (AC 3·11)", () => {
  it("13430(없는 신청)은 큐 복귀를 유도한다", () => {
    const view = decisionErrorView(13430);

    expect(view.nextStep).toBe("backToQueue");
    expect(view.message).toContain("찾을 수 없");
  });

  it("13450(심사 중 아님·동시 승인의 늦은 쪽)은 재시도가 아니라 큐 복귀를 유도한다", () => {
    const view = decisionErrorView(13450);

    expect(view.nextStep).toBe("backToQueue");
    expect(view.message).toContain("이미 처리");
  });

  it("13451(종료일 경과)은 승인 불가를 알리고 재시도를 권하지 않는다", () => {
    const view = decisionErrorView(13451);

    expect(view.nextStep).toBe("none");
    expect(view.message).toContain("종료일");
  });

  it("13452(격자 겹침)는 '위치 영역 겹침' 안내와 함께 AREA 반려로 유도한다", () => {
    const view = decisionErrorView(13452);

    expect(view.nextStep).toBe("rejectArea");
    expect(view.message).toContain("위치 영역");
    expect(view.message).toContain("겹");
  });

  it("그 외 실패는 재시도를 권한다", () => {
    expect(decisionErrorView(undefined).nextStep).toBe("retry");
    expect(decisionErrorView(9999).nextStep).toBe("retry");
  });

  it("ApiError의 developCode로 분기를 고른다 — 봉투 없는 실패는 재시도", () => {
    expect(
      decisionFailureOf(
        new ApiError("겹침", { status: 409, developCode: 13452 }),
      ).nextStep,
    ).toBe("rejectArea");
    expect(decisionFailureOf(new Error("network")).nextStep).toBe("retry");
  });
});

describe("신청 미발견 판정 (AC 12)", () => {
  it("404이거나 developCode 13430이면 미발견이다", () => {
    expect(isSubmissionNotFound(new ApiError("없음", { status: 404 }))).toBe(
      true,
    );
    expect(
      isSubmissionNotFound(new ApiError("없음", { developCode: 13430 })),
    ).toBe(true);
  });

  it("그 외 실패는 미발견이 아니다 — 재시도 안내가 맞다", () => {
    expect(
      isSubmissionNotFound(new ApiError("서버 오류", { status: 500 })),
    ).toBe(false);
    expect(isSubmissionNotFound(new Error("network"))).toBe(false);
  });
});

describe("경로 파라미터 파싱 (AC 12)", () => {
  it("양의 정수 문자열만 신청 id로 인정한다", () => {
    expect(parseSubmissionId("1204")).toBe(1204);
  });

  it("비숫자·빈 값·음수·소수는 null이다 — 미발견 안내로 수렴한다", () => {
    expect(parseSubmissionId("abc")).toBeNull();
    expect(parseSubmissionId("")).toBeNull();
    expect(parseSubmissionId(undefined)).toBeNull();
    expect(parseSubmissionId("-3")).toBeNull();
    expect(parseSubmissionId("12.5")).toBeNull();
    expect(parseSubmissionId("12a")).toBeNull();
  });

  it("0과 안전 정수를 넘는 숫자열은 null이다 — 다른 신청을 조회하거나 Infinity로 나가지 않는다", () => {
    expect(parseSubmissionId("0")).toBeNull();
    expect(parseSubmissionId("9007199254740993")).toBeNull();
    expect(parseSubmissionId("9".repeat(400))).toBeNull();
    expect(parseSubmissionId("9007199254740991")).toBe(Number.MAX_SAFE_INTEGER);
  });
});
