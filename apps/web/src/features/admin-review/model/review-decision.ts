import {
  cornersBounds,
  gridNodeAt,
  type Bounds,
  type LatLng,
} from "@/entities/cell";
// 순수 파생만 가져온다 — 548 소유 파일이라 import 전용(수정 금지)
import { rectCornersAt } from "@/features/event-submission/model/submission-area";
import { ApiError } from "@/shared/api/api-error";
import type {
  EventSubmissionAreaRectDto,
  EventSubmissionHistoryResponseDto,
  EventSubmissionLocationResponseDto,
} from "@/shared/api/generated/types.gen";
import {
  submissionStatusView,
  type SubmissionStatusTone,
} from "./submission-view";

/**
 * 관리자 심사 확정 판정 (MSG-553 AC 1·2·3·11·12) — 반려 입력 판정, 지도 표시 파생,
 * 실패 분기, 경로 파라미터 파싱을 전부 여기서 만든다. 순수·플랫폼 중립이라(지도 SDK·
 * router·window 미참조) RN 재사용 대상이다. 552의 `submission-view`는 큐 표기 정본이고
 * 이 파일은 상세·확정 정본이다 — 552 파일은 건드리지 않는다(비파괴 확장).
 *
 * 좌표 산술은 신설하지 않는다: 격자 정본(`entities/cell`의 `gridNodeAt`)과 547의
 * `rectCornersAt`만 조합한다.
 */

/** 서버가 허용하는 반려 항목 코드 4종 (`EventSubmissionRejectRequestDto` 주석 정본) */
export type RejectReasonCode = "PERIOD" | "AREA" | "IMAGE" | "INFO";

/**
 * 반려 항목 정의 (AC 1) — 코드↔라벨이 데이터로 고정된다. 순서는 Figma 2×2 배치 순서다.
 * 서버가 코드 4종·1개 이상·중복 불가만 판정하므로 FE는 이 표와 개수 게이트로 충분하다.
 */
export const REJECT_REASON_ITEMS: {
  code: RejectReasonCode;
  label: string;
}[] = [
  { code: "PERIOD", label: "행사 기간" },
  { code: "AREA", label: "위치 영역" },
  { code: "IMAGE", label: "홍보 이미지" },
  { code: "INFO", label: "행사 정보" },
];

/** 코드 → 라벨 (AC 13 반려 결과 표시) — 미지 코드는 원문을 그대로 보여 준다 */
export const rejectReasonLabel = (code: string): string =>
  REJECT_REASON_ITEMS.find((item) => item.code === code)?.label ?? code;

/**
 * 항목 체크 토글 (AC 1) — 있으면 빼고 없으면 뒤에 붙인다. 배열이 정본이라 서버가 받는
 * 순서가 화면의 체크 순서와 같고, 같은 코드가 두 번 들어갈 경로가 없다(중복 불가 계약).
 */
export const toggleReasonCode = (
  codes: readonly RejectReasonCode[],
  code: RejectReasonCode,
): RejectReasonCode[] =>
  codes.includes(code)
    ? codes.filter((existing) => existing !== code)
    : [...codes, code];

/**
 * 항목 강제 체크 (AC 11) — 승인이 13452(격자 겹침)로 막힌 뒤 "위치 영역"을 미리 켜 준다.
 * 토글과 달리 이미 켜진 항목을 끄지 않는다(같은 실패를 두 번 만나도 체크가 유지된다).
 */
export const ensureReasonCode = (
  codes: readonly RejectReasonCode[],
  code: RejectReasonCode,
): RejectReasonCode[] => (codes.includes(code) ? [...codes] : [...codes, code]);

/** 반려 제출 가능 판정 (AC 1·9) — 항목 1개 이상 AND 사유 비공백 */
export const canSubmitReject = (
  codes: readonly RejectReasonCode[],
  reasonText: string,
): boolean => codes.length > 0 && reasonText.trim().length > 0;

export interface SubmissionRejection {
  reasonCodes: string[];
  reasonText: string;
}

/**
 * 마지막 반려의 항목·사유 (AC 13) — **관리자 상세 응답에는 `rejection` 필드가 없다**
 * (`AdminEventSubmissionDetailResponseDto` 실측 — 그 필드는 운영자용
 * `EventSubmissionDetailResponseDto` 쪽에만 있다. 스펙 전제가 두 DTO를 섞었다).
 * 관리자 화면의 재료는 이력의 반려 행이며, 재신청으로 반려가 여러 번 쌓일 수 있어
 * 마지막 것을 쓴다.
 *
 * `findLast`를 쓰지 않고 역방향 루프로 도는 것은 Hermes 미구현 API를 피하기 위해서다
 * (MSG-427 — 이 파일은 RN 재사용 대상이고 게이트 6종이 그 함정을 못 잡는다).
 */
export const lastRejection = (
  history: readonly EventSubmissionHistoryResponseDto[],
): SubmissionRejection | null => {
  for (let index = history.length - 1; index >= 0; index--) {
    const row = history[index];
    if (row.status === "REJECTED" && row.reasonCodes !== null) {
      return { reasonCodes: row.reasonCodes, reasonText: row.reasonText ?? "" };
    }
  }
  return null;
};

/** 심사 중인 신청만 확정 조작 대상이다 (AC 13) — 그 외는 처리 결과 표시로 갈린다 */
export const isInReview = (status: string): boolean => status === "IN_REVIEW";

/**
 * 상세 상태 칩 (AC 5·13) — 라벨·톤 정본은 552의 `submissionStatusView`다.
 * 상세 응답의 `status`는 목록과 달리 **열린 문자열**이라(생성 타입 실측) 정본 3종만
 * 칩으로 만들고 미지 값은 null로 수렴시킨다 — `submissionTypeLabel`과 같은 처리다.
 */
export const submissionStatusChip = (
  status: string,
): { label: string; tone: SubmissionStatusTone } | null =>
  status === "IN_REVIEW" || status === "APPROVED" || status === "REJECTED"
    ? submissionStatusView(status)
    : null;

/**
 * 위치 표시명 (AC 2-a, 승인 질문 1) — 시안의 "특설무대"류 이름 필드는 응답에 없다.
 * 구역 → 행정동 → 순번으로 내려가는 폴백 체인으로 사람이 읽는 지명을 최대한 살린다.
 */
export const locationLabel = (
  location: EventSubmissionLocationResponseDto,
): string => {
  const { zoneName, zoneCell, regionName, order, cellCount } = location;
  const name =
    zoneName !== null
      ? zoneCell !== null
        ? `${zoneName} ${zoneCell}`
        : zoneName
      : (regionName ?? `위치 ${order}`);
  return `${name} · ${cellCount}칸`;
};

/** 위치 색조 — 시맨틱 토큰 이름과 1:1 (뷰가 클래스·SDK 색으로 매핑) */
export type LocationTone = "primary" | "accent" | "warning";

/** 시안의 파랑·보라·주황에 대응하는 토큰 3색 (hex 리터럴 없음 — 규칙 1) */
const LOCATION_TONES: LocationTone[] = ["primary", "accent", "warning"];

/** 위치별 색 순환 (AC 2-b, 승인 질문 2) — 위치 수 제한 없이 modulo로 돈다 */
export const locationToneAt = (index: number): LocationTone =>
  LOCATION_TONES[index % LOCATION_TONES.length];

/**
 * 노출 범위 → 진입 카메라 경계 (AC 2-c·6, 승인 질문 3) — 노출 범위 전체가 한눈에
 * 들어와야 심사가 성립한다. 격자 사각형은 EPSG:5179 축에 정렬돼 위경도로는 살짝
 * 기울어지므로 꼭짓점 4점의 min/max로 감싼다(2점 변환이면 가장자리가 잘린다 — MSG-357).
 * 그 min/max 산술은 격자 정본의 `cornersBounds`가 소유한다 — 좌표 산술 신설 0건.
 */
export const exposureBounds = (rect: EventSubmissionAreaRectDto): Bounds =>
  cornersBounds(rectCornersAt(rect));

/**
 * 사각형 북쪽 변의 가운데 (AC 6 라벨 캡슐 앵커) — 격자 경계 좌표라 `gridNodeAt`에
 * 열 중앙(반칸 포함)과 최상단 행 경계를 넣어 얻는다.
 */
export const rectTopCenter = (rect: EventSubmissionAreaRectDto): LatLng =>
  gridNodeAt({
    gridX: (rect.minGridX + rect.maxGridX + 1) / 2,
    gridY: rect.maxGridY + 1,
  });

/** 확정 실패 후 권하는 조작 (AC 3·11) */
export type DecisionNextStep =
  /** 재시도가 무의미 — 심사 큐로 돌아가 목록을 다시 본다 */
  | "backToQueue"
  /** 위치 영역(AREA) 반려로 잇는다 — 서버 doc이 지정한 다음 조작 */
  | "rejectArea"
  /** 같은 조작을 다시 시도한다 */
  | "retry"
  /** 이 조작 자체가 불가 — 다른 조작(반려)으로 처리한다 */
  | "none";

export interface DecisionErrorView {
  message: string;
  nextStep: DecisionNextStep;
}

/** 없는 신청 — 404 */
const NOT_FOUND_CODE = 13430;
/** 심사 중이 아님 / 동시 승인의 늦은 쪽 — 409 */
const NOT_IN_REVIEW_CODE = 13450;
/** 종료일 경과 — 409 */
const PERIOD_PASSED_CODE = 13451;
/** 격자 겹침 — 서버 doc이 "다음 조작은 AREA 반려"라고 명시 (reject3 주석) */
const AREA_OVERLAP_CODE = 13452;

const ERROR_VIEWS: Record<number, DecisionErrorView> = {
  [NOT_FOUND_CODE]: {
    message: "신청을 찾을 수 없어요. 심사 큐에서 다시 확인해 주세요.",
    nextStep: "backToQueue",
  },
  [NOT_IN_REVIEW_CODE]: {
    message: "이미 처리된 신청이에요. 심사 큐에서 다시 확인해 주세요.",
    nextStep: "backToQueue",
  },
  [PERIOD_PASSED_CODE]: {
    message: "행사 종료일이 지나 승인할 수 없어요. 반려로 처리해 주세요.",
    nextStep: "none",
  },
  [AREA_OVERLAP_CODE]: {
    message:
      "위치 영역이 이미 승인된 행사와 겹쳐요. '위치 영역' 항목으로 반려해 주세요.",
    nextStep: "rejectArea",
  },
};

/**
 * 확정 실패 안내 분기 (AC 3·11) — 상태 코드가 아니라 developCode로 가른다.
 * 13452는 approve doc의 에러 목록에 없고 reject doc에서만 언급돼 상태 코드가
 * 미확정이다(스펙 리스크) — 코드 기준이면 그 불확실성에 의존하지 않는다.
 */
export const decisionErrorView = (
  developCode: number | undefined,
): DecisionErrorView =>
  (developCode !== undefined ? ERROR_VIEWS[developCode] : undefined) ?? {
    message: "처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    nextStep: "retry",
  };

/** 정규화된 API 실패 → 안내 분기 (봉투 없는 실패는 재시도로 수렴) */
export const decisionFailureOf = (error: unknown): DecisionErrorView =>
  decisionErrorView(error instanceof ApiError ? error.developCode : undefined);

/**
 * 상세 조회 실패가 "신청 없음"인지 (AC 12) — 미발견은 재시도가 아니라 큐 복귀 안내다.
 * 서버는 404(13430)로 답하고, 스텁·게이트웨이가 developCode를 바꿔 실을 수 있어 둘 다 본다.
 */
export const isSubmissionNotFound = (error: unknown): boolean =>
  error instanceof ApiError &&
  (error.status === 404 || error.developCode === NOT_FOUND_CODE);

/**
 * 경로 파라미터 → 신청 id (AC 12) — 양의 정수 문자열만 인정하고 그 외는 null이다.
 * `Number("")`는 0, `Number("12.5")`는 12.5라 자릿수 패턴으로 먼저 거른다.
 *
 * 패턴만으로는 부족하다: `/^\d+$/`는 `0`과 안전 정수를 넘는 숫자열을 통과시키는데,
 * `Number()`가 그 값을 반올림하거나(9007199254740993 → …992 = **다른 신청**) Infinity로 만들어
 * 의도와 다른 id로 조회가 나간다. 유효하지 않은 경로는 요청 없이 미발견 안내로 수렴해야 한다.
 * (MSG-549 `submission-detail-view.parseSubmissionId`와 같은 계약 — 통합은 후속)
 */
export const parseSubmissionId = (raw: string | undefined): number | null => {
  if (raw === undefined || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
