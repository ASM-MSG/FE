import type { EventLocationResponseDto } from "@/shared/api/generated/types.gen";

/**
 * 테스트 전용 픽스처 — 종료 행사 아카이브 상세·위치 (MSG-519).
 * 훅 테스트(use-event-archive-query)와 스모크(event-archive-body)가 같은 서버 형태를
 * 공유해 추출했다 (envelope-response 선례 — 중복 게이트 검출).
 * 형태 정본: types.gen EventOccurrenceDetailResponseDto · EventLocationResponseDto.
 * MSG-535: 행 클릭이 toEventLocationSelection(dto)를 통과하므로 위치를 전체 DTO 형태로
 * 확장했다 (기존 단정 필드 — locationId·name·videoCount — 는 그대로).
 */

/** 상세 실측 형태 — status는 서버 시각 기준 파생 4값, UPLOAD_GRACE = 종료~+30일 */
export const ARCHIVE_DETAIL = {
  occurrenceId: 7,
  seriesId: 3,
  title: "포켓몬 메가페스타 부산",
  startsAt: "2026-07-17T10:00:00",
  endsAt: "2026-08-09T21:00:00",
  uploadClosesAt: "2026-09-08T21:00:00",
  status: "UPLOAD_GRACE",
  notificationOn: false,
  previousOccurrences: [],
};

/** 위치 목록 — 서버 정렬 그대로 두 건. 12번은 operatingHours null 경계를 겸한다 */
export const ARCHIVE_LOCATIONS: EventLocationResponseDto[] = [
  {
    locationId: 11,
    name: "부산역 웰컴 팝업",
    type: "POPUP",
    operatingHours: "10:00~18:00",
    gridIds: ["39064_112221", "39064_112222", "39065_112221"],
    representativeGridId: "39064_112221",
    zoneName: null,
    zoneCell: null,
    regionName: "초량동",
    videoCount: 12,
    organizerName: null,
    description: null,
    participationStartsOn: null,
    participationEndsOn: null,
    participationMethod: null,
    imageUrl: null,
  },
  {
    locationId: 12,
    name: "서면 포켓몬 게임존",
    type: "EXPERIENCE_ZONE",
    operatingHours: null,
    gridIds: ["39061_112885", "39061_112886"],
    representativeGridId: "39061_112885",
    zoneName: "서면 A구역",
    zoneCell: "A-3",
    regionName: "부전동",
    videoCount: 8,
    organizerName: null,
    description: null,
    participationStartsOn: null,
    participationEndsOn: null,
    participationMethod: null,
    imageUrl: null,
  },
];

export const ARCHIVE_DETAIL_PATH = "/api/event-occurrences/7";
export const ARCHIVE_LOCATIONS_PATH = "/api/event-occurrences/7/locations";
