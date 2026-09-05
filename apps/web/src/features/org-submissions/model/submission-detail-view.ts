import type {
  OrgSubmissionDetail,
  OrgSubmissionHistoryEntry,
  OrgSubmissionLocation,
  OrgSubmissionStatus,
} from "@/entities/org-submission/model/org-submission";
import { parsePositiveIntParam } from "@/shared/route-param";
import { isOrgSubmissionStatus } from "./submission-status";

/**
 * 신청 상세의 파생 값 (MSG-549 AC 5·6·7·9·10) — 접수·처리 시각, 이력 라벨, 위치 요약.
 * 순수 함수만 — 플랫폼(window·router) 무의존이라 RN 재사용 대상이다.
 *
 * 상세 응답에는 접수일·승인일 전용 필드가 없어(실측) `history`에서 파생한다:
 * 첫 entry = 접수, 마지막 전이 = 승인/처리일 (추정 3 — MSG-545 추정 5와 같은 규칙).
 */

/**
 * 경로 파라미터 → 신청 id (AC 10). 숫자가 아니면 null이라 쿼리가 발사되지 않는다.
 * 판정 자체는 `shared/route-param`이 정본이다(MSG-553 codex 3R — 복제 2벌 통합).
 */
export const parseSubmissionId = parsePositiveIntParam;

/** 접수일 — history 첫 entry의 시각 (AC 5, 추정 3). 이력이 없으면 필드를 생략한다 */
export const receivedAt = (
  history: readonly OrgSubmissionHistoryEntry[],
): string | null => history[0]?.changedAt ?? null;

/**
 * 처리일(승인일·반려 처리일) — history 마지막 전이의 시각 (AC 6·7, 추정 3).
 * 접수 1건뿐이면 아직 전이가 없으므로 null(필드 생략)이다.
 */
export const processedAt = (
  history: readonly OrgSubmissionHistoryEntry[],
): string | null =>
  history.length > 1 ? history[history.length - 1].changedAt : null;

/** 이력 1줄 — 라벨 + 전이 시각(서버 ISO 원문, 표기는 뷰가 formatKstDateTime으로) */
export interface SubmissionHistoryStep {
  label: string;
  changedAt: string;
}

const HISTORY_LABELS: Record<OrgSubmissionStatus, string> = {
  IN_REVIEW: "제출",
  APPROVED: "승인",
  REJECTED: "반려",
};

/**
 * 신청 이력 라벨링 (AC 9, 추정 8) — 첫 IN_REVIEW은 제출, 이후 IN_REVIEW은 재제출,
 * REJECTED는 반려, APPROVED는 승인이다(티켓의 "제출/반려/재제출 시각"과 정합).
 * 미지 상태는 원문 라벨로 남는다 (AC 11).
 */
export const historyTimeline = (
  history: readonly OrgSubmissionHistoryEntry[],
): SubmissionHistoryStep[] => {
  const firstReview = history.findIndex(
    (entry) => entry.status === "IN_REVIEW",
  );

  return history.map((entry, index) => ({
    label:
      entry.status === "IN_REVIEW"
        ? index === firstReview
          ? HISTORY_LABELS.IN_REVIEW
          : "재제출"
        : isOrgSubmissionStatus(entry.status)
          ? HISTORY_LABELS[entry.status]
          : entry.status,
    changedAt: entry.changedAt,
  }));
};

/**
 * 유형 전용 필드 (AC 9) — 명세상 값이 있는 것은 유형당 하나뿐이다
 * (operatingHours=POPUP · programDescription=FESTIVAL · participationMethod=EVENT).
 * `type` 대신 값의 유무로 고르므로 미지 유형에서도 안전하다.
 * EVENT의 참여 회차(`parentEvent`)는 시안·수용 기준 밖이라 이 화면이 싣지 않는다.
 */
export const typeSpecificField = (
  detail: Pick<
    OrgSubmissionDetail,
    "operatingHours" | "programDescription" | "participationMethod"
  >,
): { label: string; value: string } | null => {
  if (detail.programDescription !== null) {
    return { label: "주요 프로그램", value: detail.programDescription };
  }
  if (detail.operatingHours !== null) {
    return { label: "운영 시간", value: detail.operatingHours };
  }
  if (detail.participationMethod !== null) {
    return { label: "참여 방식", value: detail.participationMethod };
  }
  return null;
};

/** 위치 1줄 — 순번·표시명·칸 수 */
export interface SubmissionLocationRow {
  order: number;
  name: string;
  cellCount: number;
}

export interface SubmissionLocationSummary {
  /** 합계 한 줄 "위치 N곳 · 총 M칸" */
  text: string;
  items: SubmissionLocationRow[];
}

/** 칸 수 합계 — 요약과 반려 위치 검토가 공유한다 */
const totalCells = (locations: readonly OrgSubmissionLocation[]): number =>
  locations.reduce((sum, location) => sum + location.cellCount, 0);

/**
 * 위치 표시명 (AC 9) — 구역 안이면 구역명(+칸 이름), 구역 밖이면 행정동,
 * 둘 다 없으면(무귀속) 서버가 계산한 대표 격자 id로 폴백한다.
 */
const locationName = (location: OrgSubmissionLocation): string => {
  if (location.zoneName !== null) {
    return location.zoneCell === null
      ? location.zoneName
      : `${location.zoneName} ${location.zoneCell}`;
  }
  return location.regionName ?? location.representativeGridId;
};

/** 제출본 위치 영역 요약 (AC 9) — 합계 한 줄 + 위치별 표시명·칸 수 */
export const summarizeLocations = (
  locations: readonly OrgSubmissionLocation[],
): SubmissionLocationSummary => ({
  text: `위치 ${locations.length}곳 · 총 ${totalCells(locations)}칸`,
  items: locations.map((location) => ({
    order: location.order,
    name: locationName(location),
    cellCount: location.cellCount,
  })),
});

/**
 * 반려 상세의 위치 검토 (AC 7, 추정 7) — 판정 필드가 없어 반려 항목으로 파생한다:
 * `reasonCodes`에 AREA가 있으면 수정 필요, 없으면 문제 없음. 심사 중·승인 상세는
 * 접두 없이 요약(`summarizeLocations`)만 쓴다.
 */
export const locationReviewText = (
  locations: readonly OrgSubmissionLocation[],
  reasonCodes: readonly string[],
): string => {
  const verdict = reasonCodes.includes("AREA") ? "수정 필요" : "문제 없음";
  return `${verdict} · ${locations.length}곳 · 총 ${totalCells(locations)}칸`;
};
