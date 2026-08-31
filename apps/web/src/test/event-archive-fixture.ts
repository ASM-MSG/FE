/**
 * 테스트 전용 픽스처 — 종료 행사 아카이브 상세·위치 (MSG-519).
 * 훅 테스트(use-event-archive-query)와 스모크(event-archive-body)가 같은 서버 형태를
 * 공유해 추출했다 (envelope-response 선례 — 중복 게이트 검출).
 * 형태 정본: types.gen EventOccurrenceDetailResponseDto · EventLocationResponseDto
 * (위치는 화면이 소비하는 필드만).
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

/** 위치 목록 — 서버 정렬 그대로 두 건 */
export const ARCHIVE_LOCATIONS = [
  { locationId: 11, name: "부산역 웰컴 팝업", videoCount: 12 },
  { locationId: 12, name: "서면 포켓몬 게임존", videoCount: 8 },
];

export const ARCHIVE_DETAIL_PATH = "/api/event-occurrences/7";
export const ARCHIVE_LOCATIONS_PATH = "/api/event-occurrences/7/locations";
