import { ApiError } from "@/shared/api/api-error";
import { areaRowLabel, unionCellCount, type AreaRect } from "./submission-area";
import type {
  SubmissionDraftState,
  SubmissionFormConfig,
} from "./submission-form";

/**
 * 신청 전 최종 검토 파생 — 순수 로직 (MSG-548 AC 2·3·10·11·12).
 * 지도 SDK·React·라우터·플랫폼 API를 참조하지 않는다 — RN 재사용 대상.
 *
 * 요약 카드의 라벨은 지어내지 않고 `SUBMISSION_FORM_CONFIGS`(MSG-546)를 그대로 쓴다 —
 * 유형이 늘거나 라벨이 바뀌면 폼과 검토 화면이 한 자리에서 같이 따라간다.
 * 위치 산술도 신설하지 않고 `submission-area`(MSG-547)의 합집합·행 문구를 위임한다.
 */

/**
 * 검토 카드의 기간 표기 "2026. 9. 5 – 2026. 9. 7" (AC 2 — Figma 15644:2935).
 *
 * 기존 포맷터 3종을 재사용할 수 없어 신설한다(실측): `formatSubmissionDateRange`는
 * "2026-09-05 ~ 09-07", `formatSubmissionPeriod`는 "9.5–9.7"이고, 같은 꼴에 가장 가까운
 * admin-events 카드 표기는 같은 해의 연도를 축약한다 — 시안은 **양쪽 연도를 유지**한다.
 * 서버 LocalDate("YYYY-MM-DD")를 자릿수로 자른다(Date 파싱 없음 — 실행 타임존 무의존).
 */
export const reviewPeriodLabel = (startsOn: string, endsOn: string): string => {
  const dot = (date: string): string => {
    const [year, month, day] = date.split("-");
    return `${year}. ${Number(month)}. ${Number(day)}`;
  };
  return `${dot(startsOn)} – ${dot(endsOn)}`;
};

/** 요약 카드의 라벨·값 한 행 */
export interface ReviewRow {
  label: string;
  value: string;
  /** 소개·유형 전용 필드처럼 2열 격자를 가로지르는 행 (시안 배치) */
  fullWidth: boolean;
}

/** EVENT 전용 행 라벨 (추정 3 — 546이 "표시는 548 몫"으로 미뤄 둔 것) */
const PARENT_OCCURRENCE_LABEL = "소속 이벤트";

/**
 * 기본 정보 카드의 필드 행 파생 (AC 2).
 * EVENT면 확정한 소속 이벤트 행이 기간 다음에 더해진다 — 시안(지역축제)엔 없는 행이지만
 * 제출 본문에 실리는 값이라 검토 화면이 보여 준다.
 */
export const reviewBasicRows = (
  draft: SubmissionDraftState,
  config: SubmissionFormConfig,
  parentOccurrenceName: string | null,
): ReviewRow[] => {
  const { type, common, typeFieldValues } = draft;
  if (type === null) return [];

  const half = (label: string, value: string): ReviewRow => ({
    label,
    value,
    fullWidth: false,
  });

  return [
    half(config.organizerLabel, common.organizerName),
    half(config.periodLabel, reviewPeriodLabel(common.startsOn, common.endsOn)),
    ...(type === "EVENT" && parentOccurrenceName !== null
      ? [half(PARENT_OCCURRENCE_LABEL, parentOccurrenceName)]
      : []),
    {
      label: config.typeFieldLabel,
      value: typeFieldValues[type],
      fullWidth: true,
    },
    {
      label: config.descriptionLabel,
      value: common.description,
      fullWidth: true,
    },
  ];
};

export interface ReviewAreaSummary {
  /** "1곳 · 사각형 2개" — 위저드가 확정하는 위치는 1곳뿐이다 (MSG-547 계약) */
  countLabel: string;
  /** "총 13칸" — 겹친 칸을 1회만 세는 합집합 (AC 3) */
  cellLabel: string;
  /** 사각형 행 문구 — `areaRowLabel` 표기 그대로 */
  rowLabels: string[];
}

/**
 * 위치 영역 카드 요약 (AC 3) — 위치 수는 영역이 하나라도 있으면 1곳이다.
 * 시안의 "3곳"·위치 이름·zone 라벨은 서버 계약(이름 필드 부재)과 단일 위치 스토어 계약에
 * 없는 예시 데이터라 재현하지 않는다(스펙 Figma 오탐 방지).
 */
export const reviewAreaSummary = (
  areaRects: AreaRect[],
): ReviewAreaSummary => ({
  countLabel: `${areaRects.length === 0 ? 0 : 1}곳 · 사각형 ${areaRects.length}개`,
  cellLabel: `총 ${unionCellCount(areaRects)}칸`,
  rowLabels: areaRects.map((rect, index) => areaRowLabel(rect, index)),
});

/** 미등재 코드·네트워크 실패의 공통 안내 (AC 11) */
export const SUBMIT_RETRY_MESSAGE =
  "제출하지 못했어요. 잠시 후 다시 시도해 주세요.";

/**
 * developCode → 실패 안내 정본 (AC 11).
 *
 * **문서화된 코드는 4종뿐이다**(스키마 주석 실측): 13433(종료일 과거) ·
 * 13439(유형 밖 필드) · 13440(없는 회차) · 13441(종료 회차). 위치 검증 코드는 문서화돼
 * 있지 않고 FE가 상한·구조를 선제로 막으므로 정상 경로에서 발화하지 않는다 —
 * 발화하면 서버 message 폴백으로 수렴한다(MSG-542 선례).
 *
 * 13439·13440·13441은 사용자가 할 조작이 같아(유형·소속 이벤트 확인) 한 안내로 묶는다.
 */
const FAILURE_BRANCHES: readonly [codes: readonly number[], message: string][] =
  [
    [
      [13433],
      "행사 기간을 다시 확인해 주세요 — 기본 정보에서 종료일을 오늘 이후로 고쳐 주세요.",
    ],
    [
      [13439, 13440, 13441],
      "유형 또는 소속 이벤트가 유효하지 않아요 — 유형과 소속 이벤트를 다시 확인해 주세요.",
    ],
  ];

const FAILURE_BY_CODE = new Map(
  FAILURE_BRANCHES.flatMap(([codes, message]) =>
    codes.map((code) => [code, message] as const),
  ),
);

/**
 * 제출 실패 안내 (AC 11) — 등재 코드는 다음 조작을 지목하고, 미등재 코드는 서버 message를
 * 그대로 전한다(지어낸 안내로 덮지 않는다 — account-view·approved-event 선례).
 * 응답이 없던 실패(네트워크)는 서버 문구가 없으므로 일반 재시도 문구다.
 */
export const submitFailureNotice = (error: unknown): string => {
  if (!(error instanceof ApiError)) return SUBMIT_RETRY_MESSAGE;
  const matched =
    error.developCode === undefined
      ? undefined
      : FAILURE_BY_CODE.get(error.developCode);
  if (matched !== undefined) return matched;
  return error.status === undefined || error.message === ""
    ? SUBMIT_RETRY_MESSAGE
    : error.message;
};

/**
 * 접수 안내를 목적지 화면으로 넘기는 navigate state 계약 (AC 10).
 * 위저드는 이동과 함께 언마운트되고 콘솔에 전역 토스트 호스트가 없어, 안내는 목적지
 * 페이지(내 신청 목록)가 그린다 — history state라 새로고침·재방문에서 반복되지 않는다.
 */
export interface SubmissionReceiptState {
  submittedNo: string;
}

/** 라우터 state(unknown)에서 신청 번호만 검증해 꺼낸다 (AC 10) */
export const readSubmittedNo = (state: unknown): string | null => {
  if (typeof state !== "object" || state === null) return null;
  const { submittedNo } = state as { submittedNo?: unknown };
  return typeof submittedNo === "string" && submittedNo !== ""
    ? submittedNo
    : null;
};

/** 접수 안내 문구 (AC 10) — 신청 번호 + 심사 소요 고지 */
export const submissionReceiptToast = (
  submissionNo: string,
): { title: string; description: string } => ({
  title: `신청 접수 완료 · ${submissionNo}`,
  description:
    "심사는 보통 1~2영업일이 걸려요. 진행 상황은 이 목록에서 확인할 수 있어요.",
});
