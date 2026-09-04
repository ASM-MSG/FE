import type {
  EventSubmissionDetailResponseDto,
  EventSubmissionHistoryResponseDto,
  EventSubmissionLocationResponseDto,
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
 *
 * MSG-549: 상세 화면이 상태 3분기·위치·이력을 쓰게 되며 팩토리 3종(`submissionDetail`·
 * `submissionLocation`·`submissionHistory`)을 더했다. 기존 `REJECTED_DETAIL`은 값 그대로
 * 팩토리 위에 재표현했다 — MSG-545 테스트의 단정이 그대로 통과한다.
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

/** 상태 이력 1건 — 기본은 접수(제출) 전이 (MSG-549) */
export const submissionHistory = (
  overrides: Partial<EventSubmissionHistoryResponseDto> = {},
): EventSubmissionHistoryResponseDto => ({
  status: "IN_REVIEW",
  reasonCodes: null,
  reasonText: null,
  changedAt: "2026-09-18T01:24:00",
  ...overrides,
});

/** 위치 1곳 — 기본은 구역 안(구역명·칸 이름 있음) (MSG-549) */
export const submissionLocation = (
  overrides: Partial<EventSubmissionLocationResponseDto> = {},
): EventSubmissionLocationResponseDto => ({
  order: 1,
  representativeGridId: "39064_112221",
  zoneName: "서면 상권",
  zoneCell: "B-7",
  regionName: "부산진구 부전동",
  cellCount: 21,
  areaRects: [],
  ...overrides,
});

/** 위치 2곳(구역 안 1 + 구역 밖 1) — 칸 수 합계 37 (MSG-549 AC 7·9) */
export const SUBMISSION_LOCATIONS: EventSubmissionLocationResponseDto[] = [
  submissionLocation(),
  submissionLocation({
    order: 2,
    representativeGridId: "39065_112222",
    zoneName: null,
    zoneCell: null,
    regionName: "부산진구 전포동",
    cellCount: 16,
  }),
];

/**
 * 상세 응답 1건 — 기본은 심사 중(위치 2곳 · history 접수 1건) (MSG-549).
 * 상태별 변형은 호출부가 overrides로 만든다 (승인·반려 상세 3분기).
 */
export const submissionDetail = (
  overrides: Partial<EventSubmissionDetailResponseDto> = {},
): EventSubmissionDetailResponseDto => ({
  id: 11,
  submissionNo: "ES-2026-0011",
  type: "FESTIVAL",
  status: "IN_REVIEW",
  title: "서면 야간 드론쇼",
  organizerName: "서면상권활성화협의회",
  startsOn: "2026-09-05",
  endsOn: "2026-09-07",
  operatingHours: null,
  programDescription: "드론 라이트쇼 · 거리 버스킹",
  participationMethod: null,
  parentEvent: null,
  description: "서면 일대에서 열리는 야간 드론쇼입니다.",
  imageUrl: "https://cdn.example.test/seomyeon-drone.jpg",
  locations: SUBMISSION_LOCATIONS,
  rejection: null,
  history: [submissionHistory()],
  updatedAt: "2026-09-18T01:24:00",
  ...overrides,
});

/** 반려 대표(id 12)의 상세 — 사유 본문 + history 2건(제출 → 반려) */
export const REJECTED_DETAIL: EventSubmissionDetailResponseDto =
  submissionDetail({
    id: 12,
    submissionNo: "ES-2026-0012",
    type: "POPUP",
    status: "REJECTED",
    title: "서면 여름 팝업 마켓",
    startsOn: "2026-09-14",
    endsOn: "2026-09-20",
    programDescription: null,
    description: "서면 일대 팝업 마켓",
    imageUrl: "https://cdn.example.test/seomyeon-popup.jpg",
    locations: [],
    rejection: {
      reasonCodes: ["AREA_UNRELATED"],
      reasonText: "행사 장소와 직접 관련 없는 격자가 포함되어 있습니다.",
    },
    history: [
      submissionHistory({ changedAt: "2026-08-18T02:00:00" }),
      submissionHistory({
        status: "REJECTED",
        reasonCodes: ["AREA_UNRELATED"],
        reasonText: "행사 장소와 직접 관련 없는 격자가 포함되어 있습니다.",
        changedAt: "2026-08-19T03:00:00",
      }),
    ],
    updatedAt: "2026-08-19T03:00:00",
  });
