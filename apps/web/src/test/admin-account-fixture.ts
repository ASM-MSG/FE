import type {
  AdminEmailChangeRequestItemResponseDto,
  AdminEmailChangeRequestListResponseDto,
  AdminOrgAccountItemResponseDto,
  AdminOrgAccountListResponseDto,
  AdminOrgAccountRequestDetailResponseDto,
  AdminOrgAccountRequestItemResponseDto,
  AdminOrgAccountRequestListResponseDto,
} from "@/shared/api/generated/types.gen";

/**
 * 관리자 계정 운영 픽스처 (MSG-551) — 계정 목록·발급 요청 목록/상세·아이디 변경 목록.
 * 쿼리 훅 4종·뮤테이션 5종·페이지 스모크가 같은 DTO 뭉치를 필요로 해 한 자리에 둔다
 * (admin-event-fixture·admin-review-fixture 선례). 값은 서면(MVP 지역) 기준 자리표시다.
 *
 * 시각은 **접수 시각(createdAt)과 마지막 접수 시각(updatedAt)의 벽시계를 일부러 다르게**
 * 뒀다 — 발급 요청 큐가 updatedAt을(스펙 추정 8), 아이디 변경 큐가 createdAt을
 * 표기한다는 계약을 스모크가 시각 문자열로 가를 수 있게 하는 재료다.
 */
export const orgAccountItem = (
  overrides: Partial<AdminOrgAccountItemResponseDto> = {},
): AdminOrgAccountItemResponseDto => ({
  userId: 501,
  orgName: "부산진구청",
  contactName: "김담당",
  email: "tourism@busanjin.go.kr",
  contactPhone: null,
  provider: "LOCAL",
  mustChange: false,
  createdAt: "2026-09-02T01:24:00.000Z",
  ...overrides,
});

export const orgAccountList = (
  overrides: Partial<AdminOrgAccountListResponseDto> = {},
): AdminOrgAccountListResponseDto => ({
  totalElements: 1,
  page: 0,
  size: 100,
  accounts: [orgAccountItem()],
  ...overrides,
});

export const accountRequestItem = (
  overrides: Partial<AdminOrgAccountRequestItemResponseDto> = {},
): AdminOrgAccountRequestItemResponseDto => ({
  id: 77,
  orgName: "해운대구청",
  contactName: "박담당",
  email: "culture@haeundae.go.kr",
  eventName: "2026 부산 바다축제",
  status: "PENDING",
  // 최초 접수 01:00 UTC = KST 10:00 / 마지막 접수 04:24 UTC = KST 13:24
  createdAt: "2026-09-02T01:00:00.000Z",
  updatedAt: "2026-09-02T04:24:00.000Z",
  ...overrides,
});

export const accountRequestList = (
  overrides: Partial<AdminOrgAccountRequestListResponseDto> = {},
): AdminOrgAccountRequestListResponseDto => ({
  pendingCount: 3,
  issuedCount: 12,
  rejectedCount: 1,
  totalElements: 1,
  page: 0,
  size: 100,
  requests: [accountRequestItem()],
  ...overrides,
});

export const accountRequestDetail = (
  overrides: Partial<AdminOrgAccountRequestDetailResponseDto> = {},
): AdminOrgAccountRequestDetailResponseDto => ({
  id: 77,
  orgName: "해운대구청",
  contactName: "박담당",
  contactPhone: "051-749-4062",
  email: "culture@haeundae.go.kr",
  eventName: "2026 부산 바다축제",
  content: "해운대 해수욕장 일대 축제 등재를 위해 운영자 계정을 요청합니다.",
  status: "PENDING",
  rejectReason: null,
  issuedUserId: null,
  createdAt: "2026-09-02T01:00:00.000Z",
  updatedAt: "2026-09-02T04:24:00.000Z",
  processedAt: null,
  ...overrides,
});

export const emailChangeItem = (
  overrides: Partial<AdminEmailChangeRequestItemResponseDto> = {},
): AdminEmailChangeRequestItemResponseDto => ({
  id: 91,
  userId: 501,
  orgName: "부산진구청",
  email: "tourism@busanjin.go.kr",
  requestedEmail: "culture@busanjin.go.kr",
  status: "PENDING",
  // 아이디 변경 큐의 검토 기준 시각 — 05:31 UTC = KST 14:31
  createdAt: "2026-09-02T05:31:00.000Z",
  processedAt: null,
  rejectReason: null,
  ...overrides,
});

export const emailChangeList = (
  overrides: Partial<AdminEmailChangeRequestListResponseDto> = {},
): AdminEmailChangeRequestListResponseDto => ({
  pendingCount: 2,
  approvedCount: 8,
  rejectedCount: 1,
  totalElements: 1,
  page: 0,
  size: 100,
  requests: [emailChangeItem()],
  ...overrides,
});
