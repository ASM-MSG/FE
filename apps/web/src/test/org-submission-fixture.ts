import type {
  EventSubmissionDetailResponseDto,
  EventSubmissionMyListResponseDto,
  EventSubmissionSummaryResponseDto,
} from "@/shared/api/generated/types.gen";

/**
 * 테스트 전용 픽스처 — 운영자 신청 목록·상세 (MSG-545).
 * 모델 순수 테스트(필터·대표 선정·표기)·훅 테스트·페이지 스모크가 같은 서버 형태를
 * 공유해 추출했다 (event-archive-fixture 선례 — 중복 게이트 검출).
 * 형태 정본: types.gen `EventSubmissionMyListResponseDto`·`EventSubmissionDetailResponseDto`.
 *
 * 값은 시안의 예시 데이터(광안리 M 드론쇼·부산광역시 관광마이스과 등)를 쓰지 않는다 —
 * MVP 지역(부산 서면) 기준 픽스처다.
 */

export const submissionSummary = (
  overrides: Partial<EventSubmissionSummaryResponseDto> = {},
): EventSubmissionSummaryResponseDto => ({
  id: 11,
  submissionNo: "ES-2026-0011",
  type: "FESTIVAL",
  title: "서면 야간 드론쇼",
  status: "IN_REVIEW",
  startsOn: "2026-09-05",
  endsOn: "2026-09-07",
  updatedAt: "2026-09-01T02:00:00",
  ...overrides,
});

/** 서버 정렬(최신 제출 순) 3건 — 심사 중 · 반려됨 · 승인됨 각 1건 */
export const MY_SUBMISSIONS: EventSubmissionSummaryResponseDto[] = [
  submissionSummary(),
  submissionSummary({
    id: 12,
    submissionNo: "ES-2026-0012",
    title: "서면 여름 팝업 마켓",
    status: "REJECTED",
    startsOn: "2026-09-14",
    endsOn: "2026-09-20",
    updatedAt: "2026-08-19T03:00:00",
  }),
  submissionSummary({
    id: 13,
    submissionNo: "ES-2026-0013",
    type: "EVENT",
    title: "서면 빛 축제",
    status: "APPROVED",
    startsOn: "2026-10-02",
    endsOn: "2026-10-06",
    updatedAt: "2026-08-25T03:00:00",
  }),
];

/** 목록 응답 — counts는 상태별 실제 건수와 맞춘다 (합산 = 3) */
export const MY_LIST: EventSubmissionMyListResponseDto = {
  counts: { inReview: 1, approved: 1, rejected: 1 },
  submissions: MY_SUBMISSIONS,
};

/** 반려 대표(id 12)의 상세 — 사유 본문 + history 2건(제출 → 반려) */
export const REJECTED_DETAIL: EventSubmissionDetailResponseDto = {
  id: 12,
  submissionNo: "ES-2026-0012",
  type: "POPUP",
  status: "REJECTED",
  title: "서면 여름 팝업 마켓",
  organizerName: "서면상권활성화협의회",
  startsOn: "2026-09-14",
  endsOn: "2026-09-20",
  operatingHours: null,
  programDescription: null,
  participationMethod: null,
  parentEvent: null,
  description: "서면 일대 팝업 마켓",
  imageUrl: "https://cdn.example.test/seomyeon-popup.jpg",
  locations: [],
  rejection: {
    reasonCodes: ["AREA_UNRELATED"],
    reasonText: "행사 장소와 직접 관련 없는 격자가 포함되어 있습니다.",
  },
  history: [
    {
      status: "IN_REVIEW",
      reasonCodes: null,
      reasonText: null,
      changedAt: "2026-08-18T02:00:00",
    },
    {
      status: "REJECTED",
      reasonCodes: ["AREA_UNRELATED"],
      reasonText: "행사 장소와 직접 관련 없는 격자가 포함되어 있습니다.",
      changedAt: "2026-08-19T03:00:00",
    },
  ],
  updatedAt: "2026-08-19T03:00:00",
};
