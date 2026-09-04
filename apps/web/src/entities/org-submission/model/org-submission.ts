import type {
  AdminEventSubmissionItemResponseDto,
  EventSubmissionDetailResponseDto,
  EventSubmissionHistoryResponseDto,
  EventSubmissionLocationResponseDto,
  EventSubmissionRejectionResponseDto,
  EventSubmissionStatusCountsResponseDto,
  EventSubmissionSummaryResponseDto,
} from "@/shared/api/generated/types.gen";

/*
 * 운영자 콘솔의 행사 신청(submission) 도메인 모델 (MSG-545).
 * 명세 대응 필드는 생성 타입(shared/api/generated)에서 type-only 파생한다
 * (entities/dex·entities/event 선례). Required 승격은 명세가 optional로 회귀해도 화면
 * 계약을 지키는 안전망이며, 명세 필드명 변경·제거는 이 Pick이 typecheck로 잡는다.
 */

/**
 * 신청 상태 — 서버가 확정한 3값.
 *
 * 정본은 admin 심사 큐 DTO의 enum이다: 운영자 목록·상세 DTO의 `status`는 plain string으로
 * 내려와 union을 얻을 수 없다(실측). 서버가 새 상태를 추가하면 목록은 원문 라벨로 강등되고
 * 이 union만 typecheck로 흔들린다 — `isOrgSubmissionStatus` 가드가 그 경계를 지킨다.
 */
export type OrgSubmissionStatus = AdminEventSubmissionItemResponseDto["status"];

/** 상태 카운트 — 응답에 "전체" 필드가 없어 합산은 FE 몫이다 (MSG-545 추정 2) */
export type OrgSubmissionStatusCounts = Required<
  Pick<
    EventSubmissionStatusCountsResponseDto,
    "inReview" | "approved" | "rejected"
  >
>;

/**
 * 목록 행 1건 — `GET /api/org/event-submissions/my`의 submissions 원소.
 * 위치 요약(위치 N곳·총 N칸)과 신청일·반려 사유는 이 응답에 없다(실측) — 기간만 렌더한다.
 */
export type OrgSubmissionSummary = Required<
  Pick<
    EventSubmissionSummaryResponseDto,
    | "id"
    | "submissionNo"
    | "type"
    | "title"
    | "status"
    | "startsOn"
    | "endsOn"
    | "updatedAt"
  >
>;

/** 반려 사유 — 상세 API에만 있고 REJECTED일 때만 채워진다 */
export type OrgSubmissionRejection = Required<
  Pick<EventSubmissionRejectionResponseDto, "reasonCodes" | "reasonText">
>;

/** 상태 전이 이력 1건 — 발생 순. 요약 카드의 신청일·처리일 파생 재료 (추정 5) */
export type OrgSubmissionHistoryEntry = Required<
  Pick<EventSubmissionHistoryResponseDto, "status" | "changedAt">
>;

/**
 * 제출본 위치 1곳 (MSG-549) — 상세 응답의 locations 원소.
 * 표시명은 구역명·칸 이름 → 행정동 → 대표 격자 id 순으로 내려간다(구역 밖·무귀속 폴백).
 * 제출 원본 사각형(`areaRects`)은 재제출 폼(MSG-550)의 재료라 이 화면이 읽지 않는다.
 */
export type OrgSubmissionLocation = Required<
  Pick<
    EventSubmissionLocationResponseDto,
    | "order"
    | "representativeGridId"
    | "zoneName"
    | "zoneCell"
    | "regionName"
    | "cellCount"
  >
>;

/**
 * 신청 상세 (MSG-549) — `GET /api/org/event-submissions/{submissionId}`.
 *
 * 상태별 3분기(심사 중·승인·반려)의 재료가 전부 이 한 응답에 있다. 시안의 승인 번호(APR-…)·
 * 홍보 이미지 파일명·접수/승인 전용 시각 필드는 명세에 없어(실측) 각각 `submissionNo` 대체·
 * 생략·`history` 파생으로 처리한다 (추정 3·5·10).
 */
export type OrgSubmissionDetail = Required<
  Pick<
    EventSubmissionDetailResponseDto,
    | "id"
    | "submissionNo"
    | "type"
    | "status"
    | "title"
    | "organizerName"
    | "startsOn"
    | "endsOn"
    | "operatingHours"
    | "programDescription"
    | "participationMethod"
    | "parentEvent"
    | "description"
    | "imageUrl"
    | "locations"
    | "rejection"
    | "history"
  >
>;
