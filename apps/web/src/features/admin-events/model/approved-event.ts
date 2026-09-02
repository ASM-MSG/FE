import { type LatLng, cellCenterAt } from "@/entities/cell";
// KST 날짜부 규칙은 행사 도메인이 이미 소유한다 — 같은 산술을 복제하지 않는다 (MSG-516)
import { kstDateOf } from "@/features/event/model/event-chip";
import { ApiError } from "@/shared/api/api-error";
import type {
  AdminApprovedEventItemResponseDto,
  AdminApprovedEventListResponseDto,
  EventSubmissionAreaRectDto,
  EventSubmissionHistoryResponseDto,
  EventSubmissionLocationResponseDto,
} from "@/shared/api/generated/types.gen";

/**
 * 승인 행사 관리 파생 (MSG-554) — 탭·기간·상태 배지·승인일·노출 범위·사유 검증·실패 분기.
 * 순수 함수만 둔다 — 플랫폼 무의존(라우터·window 미참조), RN 재사용 대상.
 */

/** 상태 탭 = 목록 API의 status 필터 3종 */
export type ApprovedEventStatus = "EXPOSED" | "UPCOMING" | "ENDED";

/** 탭별 전체 집계 — 탭과 무관하게 응답에 늘 실려 온다 */
export type ApprovedEventCounts = Pick<
  AdminApprovedEventListResponseDto,
  "exposedCount" | "upcomingCount" | "endedCount"
>;

interface ApprovedEventTabText {
  /** 필 이름 — 카운트는 응답에서 붙인다 */
  name: string;
  /** 목록 카드 제목 */
  listTitle: string;
  /** 빈 목록 안내 (AC 12) */
  emptyMessage: string;
  countKey: keyof ApprovedEventCounts;
}

/** 탭 순서 정본 — 노출 중 → 예정 → 종료 (Figma 15579:2387~2389) */
export const APPROVED_EVENT_TAB_ORDER: readonly ApprovedEventStatus[] = [
  "EXPOSED",
  "UPCOMING",
  "ENDED",
];

const TAB_TEXT: Record<ApprovedEventStatus, ApprovedEventTabText> = {
  EXPOSED: {
    name: "노출 중",
    listTitle: "노출 중 행사",
    emptyMessage: "노출 중인 행사가 없습니다.",
    countKey: "exposedCount",
  },
  UPCOMING: {
    name: "예정",
    listTitle: "예정 행사",
    emptyMessage: "예정된 행사가 없습니다.",
    countKey: "upcomingCount",
  },
  ENDED: {
    name: "종료",
    listTitle: "종료 행사",
    emptyMessage: "종료된 행사가 없습니다.",
    countKey: "endedCount",
  },
};

/** 탭 문구 정본 조회 (AC 2·12) — 목록 카드 제목·빈 목록 안내 */
export const approvedEventTabText = (
  status: ApprovedEventStatus,
): ApprovedEventTabText => TAB_TEXT[status];

export interface ApprovedEventTabView {
  status: ApprovedEventStatus;
  /** 필 라벨 — 카운트가 도착하면 "노출 중 12", 미도착이면 이름만 */
  label: string;
  listTitle: string;
}

/**
 * 탭 필 3종 뷰 (AC 1·2) — 카운트는 탭 전환과 무관한 전체 집계라 그대로 싣는다.
 * 로딩·실패로 카운트가 없으면 숫자를 지어내지 않고 이름만 남긴다.
 */
export const approvedEventTabViews = (
  counts: ApprovedEventCounts | null,
): ApprovedEventTabView[] =>
  APPROVED_EVENT_TAB_ORDER.map((status) => {
    const { name, listTitle, countKey } = TAB_TEXT[status];
    return {
      status,
      listTitle,
      label: counts === null ? name : `${name} ${counts[countKey]}`,
    };
  });

/** "YYYY-MM-DD"·date-time → KST 연·월·일 정수 3개 */
const kstYmd = (dateTime: string): [number, number, number] => {
  const [year, month, day] = kstDateOf(dateTime).split("-").map(Number);
  return [year, month, day];
};

/**
 * 테이블 기간 표기 (AC 3) — "9.5–9.7" (Figma 15579:2395, 0패딩 없음).
 * 해가 넘어가면 양쪽에 연도를 붙여 모호함을 없앤다.
 */
export const formatRowPeriod = (startsOn: string, endsOn: string): string => {
  const [startYear, startMonth, startDay] = kstYmd(startsOn);
  const [endYear, endMonth, endDay] = kstYmd(endsOn);
  if (startYear === endYear) {
    return `${startMonth}.${startDay}–${endMonth}.${endDay}`;
  }
  return `${startYear}.${startMonth}.${startDay}–${endYear}.${endMonth}.${endDay}`;
};

/** 상세 카드 날짜 표기 — "2026. 9. 1" (Figma 15579:2416 형식) */
export const formatCardDate = (dateTime: string): string => {
  const [year, month, day] = kstYmd(dateTime);
  return `${year}. ${month}. ${day}`;
};

/** 상세 카드 기간 표기 (AC 4) — "2026. 9. 5 – 9. 7" (같은 해면 연도는 앞에만) */
export const formatCardPeriod = (startsOn: string, endsOn: string): string => {
  const [startYear] = kstYmd(startsOn);
  const [endYear, endMonth, endDay] = kstYmd(endsOn);
  const end =
    startYear === endYear ? `${endMonth}. ${endDay}` : formatCardDate(endsOn);
  return `${formatCardDate(startsOn)} – ${end}`;
};

/** 배지 색조 — 뷰가 클래스로 옮긴다 */
export type EventStatusTone = "exposed" | "upcoming" | "ended" | "unpublished";

export interface EventStatusBadgeView {
  label: string;
  tone: EventStatusTone;
}

const STATUS_BADGES: Record<string, EventStatusBadgeView> = {
  EXPOSED: { label: "노출 중", tone: "exposed" },
  UPCOMING: { label: "예정", tone: "upcoming" },
  ENDED: { label: "종료", tone: "ended" },
};

/**
 * 상태 배지 판정 (AC 3) — 중지된 행사는 파생 상태보다 중지 표기가 우선한다.
 * 중지 행사도 기간 파생 탭에 그대로 남으므로(서버 doc) 구분 표기가 필요하다.
 * status는 서버 문자열이라 미지 값은 원문을 그대로 보여준다 — 지어낸 라벨로 덮지 않는다.
 */
export const eventStatusBadge = ({
  status,
  unpublished,
}: Pick<
  AdminApprovedEventItemResponseDto,
  "status" | "unpublished"
>): EventStatusBadgeView => {
  if (unpublished) return { label: "노출 중지", tone: "unpublished" };
  return STATUS_BADGES[status] ?? { label: status, tone: "ended" };
};

/**
 * 승인일 라벨 (AC 4) — 심사 이력의 APPROVED 전이에서 "9.19"를 뽑는다.
 * 반려 후 재승인이면 마지막 APPROVED가 현재 노출의 근거다. 전이가 없으면 null.
 */
export const approvedDateLabel = (
  history: readonly Pick<
    EventSubmissionHistoryResponseDto,
    "status" | "changedAt"
  >[],
): string | null => {
  const approved = history
    .filter((entry) => entry.status === "APPROVED")
    .at(-1);
  if (approved === undefined) return null;
  const [, month, day] = kstYmd(approved.changedAt);
  return `${month}.${day}`;
};

/**
 * 노출 범위 요약 (AC 5) — "3곳 · 사각형 4개 · 총 37칸".
 * n곳 = 위치 수, 사각형 = 위치별 areaRects 합, 칸 = 위치별 cellCount 합.
 */
export const exposureSummary = (
  locations: readonly Pick<
    EventSubmissionLocationResponseDto,
    "cellCount" | "areaRects"
  >[],
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

/**
 * 노출 사각형 중심 좌표 (AC 6) — 격자 인덱스 중앙 칸의 중심을 위경도로 환산한다
 * (`cellCenterAt` = EPSG:5179 역산). "지도에서 보기" 딥링크의 목적지다.
 */
export const exposureCenter = (rect: EventSubmissionAreaRectDto): LatLng =>
  cellCenterAt({
    gridX: Math.round((rect.minGridX + rect.maxGridX) / 2),
    gridY: Math.round((rect.minGridY + rect.maxGridY) / 2),
  });

/** 중지 사유 필수 검증 (AC 7) — 공백뿐인 입력은 확정 불가 */
export const canSubmitUnpublish = (reason: string): boolean =>
  reason.trim().length > 0;

/** 이미 중지된 행사 재중지 — 409 */
const ALREADY_UNPUBLISHED_CODE = 13453;
/** 없거나 승인 상태가 아닌 행사 — 404 */
const NOT_APPROVED_CODE = 13430;

export interface UnpublishFailureNotice {
  message: string;
  /** true면 확정 재시도 대신 목록 재조회를 유도한다 (AC 9) */
  alreadyUnpublished: boolean;
}

/** 중지 실패 안내 분기 (AC 9) */
export const unpublishFailureNotice = (
  error: unknown,
): UnpublishFailureNotice => {
  if (error instanceof ApiError) {
    if (error.developCode === ALREADY_UNPUBLISHED_CODE) {
      return {
        message: "이미 중지된 행사예요. 목록을 다시 불러와 확인해 주세요.",
        alreadyUnpublished: true,
      };
    }
    if (error.developCode === NOT_APPROVED_CODE) {
      return {
        message: "행사를 찾을 수 없어요. 목록을 다시 불러와 확인해 주세요.",
        alreadyUnpublished: false,
      };
    }
  }
  return {
    message: "노출을 중지하지 못했어요. 잠시 후 다시 시도해 주세요.",
    alreadyUnpublished: false,
  };
};

/**
 * 사유 메일 발송 실패 안내 (AC 10) — 중지 자체는 유지된다(서버 doc).
 * 재발송 API가 없어 저장된 사유가 수기 재통지 재료다.
 */
export const EMAIL_FAILED_NOTICE =
  "사유 메일 발송에 실패했어요. 노출 중지는 그대로 유지됩니다.";
