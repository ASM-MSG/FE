import type {
  AdminApprovedEventItemResponseDto,
  AdminApprovedEventListResponseDto,
  AdminEventSubmissionDetailResponseDto,
} from "@/shared/api/generated/types.gen";

/**
 * 관리자 승인 행사 픽스처 (MSG-554) — 목록 항목·목록 응답·심사 상세 3종.
 * 훅 테스트(목록·상세·중지)와 페이지 스모크가 같은 DTO를 필요로 해 한 자리에 둔다
 * (event-video-fixture 선례). 값은 서면(MVP 지역) 기준 자리표시다.
 */
export const approvedEventItem = (
  overrides: Partial<AdminApprovedEventItemResponseDto> = {},
): AdminApprovedEventItemResponseDto => ({
  submissionId: 41,
  approvalNo: "AP-2026-0041",
  submissionNo: "SB-2026-0041",
  type: "FESTIVAL",
  title: "서면 골목 빛축제",
  organizerName: "부산진구 문화관광과",
  orgName: "부산진구청",
  startsOn: "2026-09-05",
  endsOn: "2026-09-07",
  status: "EXPOSED",
  unpublished: false,
  unpublishedAt: null,
  unpublishReason: null,
  ...overrides,
});

export const approvedEventList = (
  overrides: Partial<AdminApprovedEventListResponseDto> = {},
): AdminApprovedEventListResponseDto => ({
  exposedCount: 12,
  upcomingCount: 4,
  endedCount: 31,
  totalElements: 1,
  page: 0,
  size: 100,
  events: [approvedEventItem()],
  ...overrides,
});

export const eventSubmissionDetail = (
  overrides: Partial<AdminEventSubmissionDetailResponseDto> = {},
): AdminEventSubmissionDetailResponseDto => ({
  id: 41,
  submissionNo: "SB-2026-0041",
  type: "FESTIVAL",
  status: "APPROVED",
  title: "서면 골목 빛축제",
  organizerName: "부산진구 문화관광과",
  startsOn: "2026-09-05",
  endsOn: "2026-09-07",
  operatingHours: null,
  programDescription: "야간 조명 산책로",
  participationMethod: null,
  parentEvent: null,
  description: "서면 골목을 조명으로 채우는 축제",
  imageUrl: "https://cdn.fillmap.kr/submissions/41.jpg",
  orgName: "부산진구청",
  contactName: "김담당",
  email: "tourism@busanjin.go.kr",
  // 격자 인덱스는 서면(gridX 11420 · gridY 16858) 주변 실값 — 좌표 파생이 한국 범위에 든다
  locations: [
    {
      order: 1,
      representativeGridId: "16858_11420",
      zoneName: "서면 젊음의거리",
      zoneCell: "B3",
      regionName: "부전2동",
      cellCount: 20,
      areaRects: [
        { minGridX: 11418, maxGridX: 11421, minGridY: 16856, maxGridY: 16859 },
        { minGridX: 11422, maxGridX: 11423, minGridY: 16856, maxGridY: 16857 },
      ],
    },
    {
      order: 2,
      representativeGridId: "16860_11425",
      zoneName: null,
      zoneCell: null,
      regionName: "전포동",
      cellCount: 17,
      areaRects: [
        { minGridX: 11425, maxGridX: 11427, minGridY: 16860, maxGridY: 16862 },
      ],
    },
  ],
  exposureRect: {
    minGridX: 11418,
    maxGridX: 11427,
    minGridY: 16856,
    maxGridY: 16862,
  },
  history: [
    {
      status: "SUBMITTED",
      reasonCodes: null,
      reasonText: null,
      changedAt: "2026-08-17T02:00:00Z",
    },
    {
      status: "APPROVED",
      reasonCodes: null,
      reasonText: null,
      changedAt: "2026-08-19T02:00:00Z",
    },
  ],
  createdAt: "2026-08-17T02:00:00Z",
  updatedAt: "2026-08-19T02:00:00Z",
  ...overrides,
});
