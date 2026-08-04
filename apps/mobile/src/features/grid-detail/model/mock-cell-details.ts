/**
 * 격자 상세 mock 데이터 — 부산 서면 기준 (MSG-296 AC 11, 서울 지명 금지).
 * 웹 `apps/web/src/entities/cell/model/mock-cells.ts`의 서면 일대 시드 이식본 —
 * 웹 생성 API 타입(satisfies) 의존은 제거하고 로컬 인터페이스로 둔다 (D1 관례,
 * 스펙 리스크 3: 웹-모바일 mock 드리프트는 parity 대상 아님, 데이터는 화면별 소유).
 * 격자 id는 홈 mock-grid-videos의 격자 id와 정합시킨다 (스펙 구현 계획).
 * 범천 I-01은 영상 0개 격자 — 빈 상태(AC 10) 시연용.
 */

export interface MockCellVideo {
  title: string;
  viewCount: number;
  /** 등록 시각(ISO) — 상대시간 메타 표기용 */
  recordedAt: string;
  durationSec: number;
}

export interface MockCellDetail {
  /** 홈 mock-grid-videos와 정합하는 격자 id */
  id: string;
  label: string;
  /** "부산 {구} {동}" — 위치 표기 (AC 5) */
  location: string;
  /** 셀 소속 판정용 대표 좌표 — cellIndexAt으로 격자 인덱스 파생 */
  center: { lat: number; lng: number };
  /** 담수율(%) */
  fillRate: number;
  /** 격자 전체 영상 수 — videos는 최근 표본이라 개수가 다르다 */
  videoCount: number;
  viewCount: number;
  /** 최신 업로드 시각(ISO) — 영상 0개 격자는 null */
  recentUploadedAt: string | null;
  /** 목록에 노출할 최근 영상 표본 */
  videos: MockCellVideo[];
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 상대 시간 표시가 항상 자연스럽게 보이도록 로드 시점 기준 과거 ISO를 만든다 (mock 전용, 웹 관례) */
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

/** 영상 표본 순환 배열 — 웹 mock-cells와 동일 값 (부산 서면 무드, AC 11) */
const VIDEO_TITLES = [
  "거리 야경 감성 스팟",
  "숨은 골목 카페 투어",
  "주말 플리마켓 현장",
  "노을 지는 광안대교뷰",
  "비 오는 날 우산 씬",
];
const VIDEO_DURATIONS = [12, 26, 9, 30, 21];
const VIDEO_VIEWS = [214, 1400, 58, 12000, 320];
const VIDEO_AGES = [5 * MINUTE, 3 * HOUR, 21 * HOUR, 2 * DAY, 6 * DAY];

const buildVideos = (sampleSize: number): MockCellVideo[] =>
  Array.from({ length: sampleSize }, (_, i) => ({
    title: VIDEO_TITLES[i % VIDEO_TITLES.length],
    viewCount: VIDEO_VIEWS[i % VIDEO_VIEWS.length],
    recordedAt: isoAgo(VIDEO_AGES[i % VIDEO_AGES.length]),
    durationSec: VIDEO_DURATIONS[i % VIDEO_DURATIONS.length],
  }));

interface CellSeed {
  id: string;
  label: string;
  location: string;
  center: { lat: number; lng: number };
  fillRate: number;
  videoCount: number;
  viewCount: number;
  /** 최신 업로드 경과(ms) — 영상 0개 격자는 생략 */
  recentAgo?: number;
  sampleSize: number;
}

/** 웹 mock-cells 서면 일대 시드 — 통계 값 동일 (서면 A-14: 73%·138개·1.4K, 추정 5) */
const SEEDS: CellSeed[] = [
  {
    id: "seomyeon-a-14",
    label: "서면 A-14",
    location: "부산 부산진구 서면",
    center: { lat: 35.1573, lng: 129.0586 },
    fillRate: 73,
    videoCount: 138,
    viewCount: 1400,
    recentAgo: 5 * MINUTE,
    sampleSize: 5,
  },
  {
    id: "jeonpo-a-15",
    label: "전포 A-15",
    location: "부산 부산진구 전포",
    center: { lat: 35.1552, lng: 129.0633 },
    fillRate: 61,
    videoCount: 72,
    viewCount: 8600,
    recentAgo: 2 * HOUR,
    sampleSize: 4,
  },
  {
    id: "bujeon-b-07",
    label: "부전 B-07",
    location: "부산 부산진구 부전",
    center: { lat: 35.1631, lng: 129.0604 },
    fillRate: 48,
    videoCount: 54,
    viewCount: 5200,
    recentAgo: 9 * HOUR,
    sampleSize: 4,
  },
  {
    id: "yangjeong-b-08",
    label: "양정 B-08",
    location: "부산 부산진구 양정",
    center: { lat: 35.1699, lng: 129.0708 },
    fillRate: 67,
    videoCount: 91,
    viewCount: 12000,
    recentAgo: 40 * MINUTE,
    sampleSize: 5,
  },
  {
    id: "yeonsan-h-11",
    label: "연산 H-11",
    location: "부산 연제구 연산",
    center: { lat: 35.1799, lng: 129.0796 },
    fillRate: 45,
    videoCount: 58,
    viewCount: 4600,
    recentAgo: 6 * HOUR,
    sampleSize: 4,
  },
  // 영상 0개 격자 — 빈 상태 시연 (AC 10). 홈 시트 videoCount(17)와의 드리프트는
  // 웹 시드(범천 I-01 = 0개) 우선 — mock은 화면별 소유 (스펙 리스크 3)
  {
    id: "beomcheon-i-01",
    label: "범천 I-01",
    location: "부산 부산진구 범천",
    center: { lat: 35.1461, lng: 129.0592 },
    fillRate: 0,
    videoCount: 0,
    viewCount: 0,
    sampleSize: 0,
  },
];

export const MOCK_CELL_DETAILS: MockCellDetail[] = SEEDS.map(
  ({ recentAgo, sampleSize, ...rest }) => ({
    ...rest,
    recentUploadedAt: recentAgo === undefined ? null : isoAgo(recentAgo),
    videos: buildVideos(sampleSize),
  }),
);
