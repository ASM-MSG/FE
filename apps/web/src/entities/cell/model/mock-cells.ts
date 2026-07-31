import type { Cell, CellVideo } from "./cell";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 상대 시간 표시가 항상 자연스럽게 보이도록 로드 시점 기준 과거 ISO를 만든다 (mock 전용). */
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

const VIDEO_TITLES = [
  "거리 야경 감성 스팟",
  "숨은 골목 카페 투어",
  "주말 플리마켓 현장",
  "노을 지는 광안대교뷰",
  "비 오는 날 우산 씬",
];
const VIDEO_DURATIONS = [42, 96, 27, 184, 63];
// 1만 이상 값(12000)을 포함해 홈 피드의 "1.2만" 축약(MSG-277 AC 6)이 화면에서 시연되게 한다
const VIDEO_VIEWS = [214, 1400, 58, 12000, 320];
const VIDEO_AGES = [5 * MINUTE, 3 * HOUR, 21 * HOUR, 2 * DAY, 6 * DAY];
// 업로더 핸들 — 홈 셀 상세의 다른 사용자 카드 메타(MSG-253), 부산 서면 무드
const VIDEO_HANDLES = [
  "@minji_b",
  "@busan.vlog",
  "@seomyeon_now",
  "@jeonpo_alley",
  "@haeundae_walk",
];

/** 격자당 대표 리스트에 노출할 개별 영상 표본을 만든다 (전체 videoCount와 별개인 최근 표본). */
const buildVideos = (cellId: string, sampleSize: number): CellVideo[] =>
  Array.from({ length: sampleSize }, (_, i) => ({
    id: `${cellId}-v${i + 1}`,
    title: VIDEO_TITLES[i % VIDEO_TITLES.length],
    viewCount: VIDEO_VIEWS[i % VIDEO_VIEWS.length],
    uploadedAt: isoAgo(VIDEO_AGES[i % VIDEO_AGES.length]),
    durationSec: VIDEO_DURATIONS[i % VIDEO_DURATIONS.length],
    uploaderHandle: VIDEO_HANDLES[i % VIDEO_HANDLES.length],
  }));

interface CellSeed {
  id: string;
  label: string;
  district: string;
  center: { lat: number; lng: number };
  videoCount: number;
  createdAt: string;
  durationSec?: number;
  location: string;
  recentAgo: number;
  fillRate: number;
  viewCount: number;
  /** 리스트에 노출할 개별 영상 표본 수 */
  sampleSize: number;
}

const SEEDS: CellSeed[] = [
  { id: "A-14", label: "서면 A-14", district: "부산진구", center: { lat: 35.1573, lng: 129.0586 }, videoCount: 138, createdAt: "2026-07-10T09:00:00.000Z", durationSec: 24, location: "부산 부산진구 서면", recentAgo: 5 * MINUTE, fillRate: 73, viewCount: 1400, sampleSize: 5 },
  { id: "A-15", label: "전포 A-15", district: "부산진구", center: { lat: 35.1552, lng: 129.0633 }, videoCount: 72, createdAt: "2026-06-28T09:00:00.000Z", durationSec: 84, location: "부산 부산진구 전포", recentAgo: 2 * HOUR, fillRate: 61, viewCount: 8600, sampleSize: 4 },
  { id: "B-07", label: "부전 B-07", district: "부산진구", center: { lat: 35.1631, lng: 129.0604 }, videoCount: 54, createdAt: "2026-07-05T09:00:00.000Z", location: "부산 부산진구 부전", recentAgo: 9 * HOUR, fillRate: 48, viewCount: 5200, sampleSize: 4 },
  { id: "B-08", label: "양정 B-08", district: "부산진구", center: { lat: 35.1699, lng: 129.0708 }, videoCount: 91, createdAt: "2026-07-14T09:00:00.000Z", durationSec: 132, location: "부산 부산진구 양정", recentAgo: 40 * MINUTE, fillRate: 67, viewCount: 12000, sampleSize: 5 },
  { id: "C-02", label: "광안리 C-02", district: "수영구", center: { lat: 35.1532, lng: 129.1187 }, videoCount: 205, createdAt: "2026-07-01T09:00:00.000Z", durationSec: 605, location: "부산 수영구 광안리", recentAgo: 12 * MINUTE, fillRate: 88, viewCount: 24000, sampleSize: 5 },
  { id: "C-03", label: "민락 C-03", district: "수영구", center: { lat: 35.1571, lng: 129.1214 }, videoCount: 47, createdAt: "2026-06-20T09:00:00.000Z", durationSec: 47, location: "부산 수영구 민락", recentAgo: 1 * DAY, fillRate: 39, viewCount: 3100, sampleSize: 3 },
  { id: "D-01", label: "대연 D-01", district: "남구", center: { lat: 35.1365, lng: 129.1005 }, videoCount: 119, createdAt: "2026-07-12T09:00:00.000Z", durationSec: 210, location: "부산 남구 대연", recentAgo: 33 * MINUTE, fillRate: 71, viewCount: 15400, sampleSize: 5 },
  { id: "D-02", label: "용호 D-02", district: "남구", center: { lat: 35.1153, lng: 129.1123 }, videoCount: 33, createdAt: "2026-06-15T09:00:00.000Z", location: "부산 남구 용호", recentAgo: 3 * DAY, fillRate: 34, viewCount: 2200, sampleSize: 3 },
  { id: "E-05", label: "해운대 E-05", district: "해운대구", center: { lat: 35.1587, lng: 129.1604 }, videoCount: 176, createdAt: "2026-07-08T09:00:00.000Z", durationSec: 366, location: "부산 해운대구 해운대", recentAgo: 8 * MINUTE, fillRate: 82, viewCount: 31000, sampleSize: 5 },
  { id: "E-06", label: "센텀 E-06", district: "해운대구", center: { lat: 35.1691, lng: 129.1312 }, videoCount: 88, createdAt: "2026-06-30T09:00:00.000Z", durationSec: 59, location: "부산 해운대구 센텀", recentAgo: 4 * HOUR, fillRate: 59, viewCount: 7400, sampleSize: 4 },
  { id: "F-09", label: "온천장 F-09", district: "동래구", center: { lat: 35.2211, lng: 129.0866 }, videoCount: 64, createdAt: "2026-07-11T09:00:00.000Z", durationSec: 148, location: "부산 동래구 온천장", recentAgo: 55 * MINUTE, fillRate: 52, viewCount: 6100, sampleSize: 4 },
  { id: "F-10", label: "명륜 F-10", district: "동래구", center: { lat: 35.213, lng: 129.0834 }, videoCount: 21, createdAt: "2026-06-25T09:00:00.000Z", location: "부산 동래구 명륜", recentAgo: 5 * DAY, fillRate: 27, viewCount: 1100, sampleSize: 2 },
  { id: "G-03", label: "초량 G-03", district: "동구", center: { lat: 35.1177, lng: 129.0394 }, videoCount: 97, createdAt: "2026-07-13T09:00:00.000Z", durationSec: 302, location: "부산 동구 초량", recentAgo: 18 * MINUTE, fillRate: 64, viewCount: 9800, sampleSize: 5 },
  { id: "G-04", label: "범일 G-04", district: "동구", center: { lat: 35.1368, lng: 129.0562 }, videoCount: 142, createdAt: "2026-07-03T09:00:00.000Z", durationSec: 75, location: "부산 동구 범일", recentAgo: 2 * HOUR, fillRate: 76, viewCount: 18700, sampleSize: 5 },
  { id: "H-11", label: "연산 H-11", district: "연제구", center: { lat: 35.1799, lng: 129.0796 }, videoCount: 58, createdAt: "2026-07-06T09:00:00.000Z", durationSec: 41, location: "부산 연제구 연산", recentAgo: 6 * HOUR, fillRate: 45, viewCount: 4600, sampleSize: 4 },
  { id: "H-12", label: "거제 H-12", district: "연제구", center: { lat: 35.1907, lng: 129.0745 }, videoCount: 12, createdAt: "2026-06-18T09:00:00.000Z", location: "부산 연제구 거제", recentAgo: 4 * DAY, fillRate: 19, viewCount: 640, sampleSize: 2 },
  // videoCount === 0 격자 — 상세 선택 no-op·카드 비활성(AC 2·3) 검증용
  { id: "I-01", label: "범천 I-01", district: "부산진구", center: { lat: 35.1461, lng: 129.0592 }, videoCount: 0, createdAt: "2026-07-02T09:00:00.000Z", location: "부산 부산진구 범천", recentAgo: 7 * DAY, fillRate: 0, viewCount: 0, sampleSize: 0 },
];

/**
 * 부산 일대 mock 격자 데이터.
 * 실 API 연동 전까지 뷰포트 매칭·요약 집계·상세 시트(MSG-115) 시연을 위한 임시 소스.
 * 라벨은 "지역명 + 코드" 형식(Figma 13399-1208 확인), 영상 수는 편차를 두어 배치.
 * createdAt은 "최신순"(D3), durationSec은 카드 길이 배지(S5) 시연용 —
 * 일부 격자는 durationSec을 생략해 배지 미표시(S6)를 검증할 수 있게 둔다.
 * district는 지역 필터(MSG-114 D1) 매칭 키 — 값은 전체 지역 목데이터(entities/region)의 구 이름과 일치시킨다.
 * location·recentUploadedAt·fillRate·viewCount·videos는 상세 시트(MSG-115) 표시용.
 * videoCount === 0인 격자(I-01)를 하나 포함해 상세 선택 no-op·카드 비활성(AC 2·3)을 검증한다.
 */
export const MOCK_CELLS: Cell[] = SEEDS.map(
  ({ recentAgo, sampleSize, ...rest }) => ({
    ...rest,
    recentUploadedAt: isoAgo(recentAgo),
    videos: buildVideos(rest.id, sampleSize),
  }),
);
