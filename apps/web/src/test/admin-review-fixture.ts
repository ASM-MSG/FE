import type {
  AdminEventSubmissionDetailResponseDto,
  AdminEventSubmissionItemResponseDto,
  AdminEventSubmissionListResponseDto,
} from "@/shared/api/generated/types.gen";
import { envelopeResponse, errorEnvelope } from "./envelope-response";
import { stubFetch } from "./stub-fetch";

/**
 * 관리자 심사 큐 픽스처 (MSG-552) — 목록·상세 응답과 fetch 라우터.
 * 쿼리 훅 2종과 페이지 스모크가 같은 DTO 뭉치를 필요로 해 한 자리에 뒀다
 * (playback-fixture 선례 — 도메인 픽스처의 src/test 배치).
 */
/** 목록 항목과 상세가 공유하는 신청 식별·표기 필드 */
const SHARED_FIELDS = {
  id: 1204,
  submissionNo: "ES-2026-1204",
  type: "FESTIVAL",
  status: "IN_REVIEW",
  title: "광안리 M 드론쇼",
  organizerName: "부산시 관광마이스과",
  orgName: "부산광역시 관광마이스과",
  startsOn: "2026-09-05",
  endsOn: "2026-09-07",
  createdAt: "2026-09-02T01:24:00.000Z",
  updatedAt: "2026-09-02T01:24:00.000Z",
} as const;

export const submissionItem = (
  overrides: Partial<AdminEventSubmissionItemResponseDto> = {},
): AdminEventSubmissionItemResponseDto => ({
  ...SHARED_FIELDS,
  locationCount: 3,
  ...overrides,
});

export const submissionList = (
  submissions: AdminEventSubmissionItemResponseDto[],
  counts = { inReview: 4, approved: 12, rejected: 3 },
): AdminEventSubmissionListResponseDto => ({
  counts,
  totalElements: submissions.length,
  page: 0,
  size: 100,
  submissions,
});

export const submissionDetail = (
  overrides: Partial<AdminEventSubmissionDetailResponseDto> = {},
): AdminEventSubmissionDetailResponseDto => ({
  ...SHARED_FIELDS,
  operatingHours: null,
  programDescription: "드론 라이트쇼 · 야간 버스킹",
  participationMethod: null,
  parentEvent: null,
  description: "광안리 해변 일대 드론쇼",
  imageUrl: "https://cdn.fillmap.kr/submissions/1204.jpg?signature=abc",
  contactName: "김담당",
  email: "tourism@busan.go.kr",
  locations: [
    {
      order: 1,
      representativeGridId: "39064_112221",
      zoneName: "광안리",
      zoneCell: "B-7",
      regionName: "수영구 광안동",
      cellCount: 20,
      areaRects: [
        { minGridY: 0, maxGridY: 4, minGridX: 0, maxGridX: 3 },
        { minGridY: 5, maxGridY: 6, minGridX: 0, maxGridX: 1 },
      ],
    },
    {
      order: 2,
      representativeGridId: "39064_112222",
      zoneName: null,
      zoneCell: null,
      regionName: "수영구 민락동",
      cellCount: 17,
      areaRects: [{ minGridY: 0, maxGridY: 4, minGridX: 0, maxGridX: 3 }],
    },
  ],
  exposureRect: { minGridY: 0, maxGridY: 6, minGridX: 0, maxGridX: 3 },
  history: [],
  createdAt: "2026-09-02T01:24:00.000Z",
  updatedAt: "2026-09-02T01:24:00.000Z",
  ...overrides,
});

const LIST_PATH = "/api/admin/event-submissions";

interface AdminReviewStubOptions {
  /** 상태별 목록 — 요청 query.status로 고른다 */
  lists: Record<string, AdminEventSubmissionItemResponseDto[]>;
  /** 신청 id별 상세 — 없는 id는 404 봉투 */
  details?: Record<number, AdminEventSubmissionDetailResponseDto>;
  /** 목록 조회를 실패시킬지 요청 시점에 판정한다 (실패 → 재시도 성공 경로 검증용) */
  listFails?: () => boolean;
}

/**
 * 심사 큐 fetch 라우터 — 목록은 status로 갈리고, page·size가 단일 페이지 계약
 * (page=0·size=100, 추정 4)을 벗어나면 서버처럼 400(13456)을 낸다.
 */
export const adminReviewFetch = ({
  lists,
  details = {},
  listFails = () => false,
}: AdminReviewStubOptions) =>
  stubFetch((request) => {
    const { pathname, searchParams } = new URL(request.url);

    if (pathname === LIST_PATH) {
      if (listFails()) return errorEnvelope(13400, "list failed", 500);
      if (
        searchParams.get("page") !== "0" ||
        searchParams.get("size") !== "100"
      )
        return errorEnvelope(13456, "page/size out of range", 400);
      const status = searchParams.get("status") ?? "IN_REVIEW";
      return envelopeResponse(submissionList(lists[status] ?? []));
    }

    if (pathname.startsWith(`${LIST_PATH}/`)) {
      const submissionId = Number(pathname.slice(LIST_PATH.length + 1));
      const detail = details[submissionId];
      if (detail === undefined) return errorEnvelope(13404, "not found", 404);
      return envelopeResponse(detail);
    }

    return errorEnvelope(9999, `unexpected request: ${pathname}`, 500);
  });
