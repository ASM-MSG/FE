import type {
  AdminEventSubmissionItemResponseDto,
  EventSubmissionLocationResponseDto,
  EventSubmissionStatusCountsResponseDto,
} from "@/shared/api/generated/types.gen";

/**
 * 관리자 심사 큐 표기 파생 (MSG-552 AC 2) — 목록 행·상태 탭·미리보기 카드가 쓰는
 * 문자열을 전부 여기서 만든다. 순수·플랫폼 중립(지도 SDK·router·window 미참조)이라
 * RN 재사용 대상이다. 날짜 문자열("YYYY-MM-DD")은 `new Date`로 파싱하지 않고
 * 자릿수로 자른다 — `new Date("2026-09-05")`는 UTC 자정으로 파싱돼 실행 환경
 * 타임존에 따라 하루가 밀린다(upload-grass의 KST 산술과 같은 함정).
 */

export type SubmissionStatus = AdminEventSubmissionItemResponseDto["status"];

/** 상태 탭 정본 (AC 5) — 라벨과 counts 필드가 짝이다 */
export const SUBMISSION_STATUS_TABS: {
  status: SubmissionStatus;
  label: string;
  countKey: keyof EventSubmissionStatusCountsResponseDto;
}[] = [
  { status: "IN_REVIEW", label: "심사 중", countKey: "inReview" },
  { status: "APPROVED", label: "승인됨", countKey: "approved" },
  { status: "REJECTED", label: "반려됨", countKey: "rejected" },
];

/** "YYYY-MM-DD" → [연, 월, 일] 정수 (TZ 무관) */
const dateParts = (isoDate: string): [number, number, number] => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return [year, month, day];
};

/** 목록 일정 라벨 — 기간이면 "9.5–9.7", 하루면 "9.12" [AC 2-a] */
export const formatScheduleLabel = (
  startsOn: string,
  endsOn: string,
): string => {
  const [, startMonth, startDay] = dateParts(startsOn);
  const start = `${startMonth}.${startDay}`;
  if (startsOn === endsOn) return start;
  const [, endMonth, endDay] = dateParts(endsOn);
  return `${start}–${endMonth}.${endDay}`;
};

/** 목록 위치 요약 — 목록 응답에 있는 것은 위치 수뿐이다 [AC 2-b] */
export const formatLocationCountLabel = (locationCount: number): string =>
  `위치 ${locationCount}곳`;

/** 미리보기 기간 — "2026. 9. 5 – 9. 7", 하루면 "2026. 9. 12" [AC 2-c] */
export const formatPreviewPeriod = (
  startsOn: string,
  endsOn: string,
): string => {
  const [startYear, startMonth, startDay] = dateParts(startsOn);
  const start = `${startYear}. ${startMonth}. ${startDay}`;
  if (startsOn === endsOn) return start;
  const [, endMonth, endDay] = dateParts(endsOn);
  return `${start} – ${endMonth}. ${endDay}`;
};

/**
 * 미리보기 위치 요약 — "3곳 · 사각형 4개 · 총 37칸" [AC 2-d].
 * 사각형 수는 상세 locations의 areaRects 길이 합, 칸 수는 cellCount 합이다
 * (목록 응답에는 둘 다 없어 상세 보강이 필요하다 — 추정 1).
 */
export const formatPreviewAreaSummary = (
  locations: EventSubmissionLocationResponseDto[],
): string => {
  const rectCount = locations.reduce(
    (sum, location) => sum + location.areaRects.length,
    0,
  );
  const cellCount = locations.reduce(
    (sum, location) => sum + location.cellCount,
    0,
  );
  return `${locations.length}곳 · 사각형 ${rectCount}개 · 총 ${cellCount}칸`;
};

const TYPE_LABELS: Record<string, string> = {
  FESTIVAL: "지역축제",
  POPUP: "팝업스토어",
  EVENT: "이벤트 참여형",
};

/**
 * 등록 유형 라벨 [AC 2-e, 추정 5] — 생성 스키마의 한국어 주석이 정본이다.
 * 상세 응답의 `type`은 열린 문자열이라 미지 값은 null(라벨 미표시)로 수렴한다.
 */
export const submissionTypeLabel = (type: string): string | null =>
  TYPE_LABELS[type] ?? null;

/** 상태 칩의 톤 — 시맨틱 토큰 이름과 1:1 (뷰가 클래스로 매핑) */
export type SubmissionStatusTone = "warning" | "success" | "error";

const STATUS_VIEWS: Record<
  SubmissionStatus,
  { label: string; tone: SubmissionStatusTone }
> = {
  IN_REVIEW: { label: "심사 중", tone: "warning" },
  APPROVED: { label: "승인됨", tone: "success" },
  REJECTED: { label: "반려됨", tone: "error" },
};

/** 신청 상태 라벨·톤 [AC 2-f, 추정 7] */
export const submissionStatusView = (
  status: SubmissionStatus,
): { label: string; tone: SubmissionStatusTone } => STATUS_VIEWS[status];
