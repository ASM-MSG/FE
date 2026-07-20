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
  "노을 지는 한강뷰",
  "비 오는 날 우산 씬",
];
const VIDEO_DURATIONS = [42, 96, 27, 184, 63];
const VIDEO_VIEWS = [214, 1400, 58, 8900, 320];
const VIDEO_AGES = [5 * MINUTE, 3 * HOUR, 21 * HOUR, 2 * DAY, 6 * DAY];

/** 격자당 대표 리스트에 노출할 개별 영상 표본을 만든다 (전체 videoCount와 별개인 최근 표본). */
const buildVideos = (cellId: string, sampleSize: number): CellVideo[] =>
  Array.from({ length: sampleSize }, (_, i) => ({
    id: `${cellId}-v${i + 1}`,
    title: VIDEO_TITLES[i % VIDEO_TITLES.length],
    viewCount: VIDEO_VIEWS[i % VIDEO_VIEWS.length],
    uploadedAt: isoAgo(VIDEO_AGES[i % VIDEO_AGES.length]),
    durationSec: VIDEO_DURATIONS[i % VIDEO_DURATIONS.length],
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
  { id: "A-14", label: "홍대입구 A-14", district: "마포구", center: { lat: 37.5573, lng: 126.9245 }, videoCount: 138, createdAt: "2026-07-10T09:00:00.000Z", durationSec: 24, location: "서울 마포구 홍대입구", recentAgo: 5 * MINUTE, fillRate: 73, viewCount: 1400, sampleSize: 5 },
  { id: "A-15", label: "합정 A-15", district: "마포구", center: { lat: 37.5495, lng: 126.9137 }, videoCount: 72, createdAt: "2026-06-28T09:00:00.000Z", durationSec: 84, location: "서울 마포구 합정", recentAgo: 2 * HOUR, fillRate: 61, viewCount: 8600, sampleSize: 4 },
  { id: "B-07", label: "망원 B-07", district: "마포구", center: { lat: 37.5556, lng: 126.9016 }, videoCount: 54, createdAt: "2026-07-05T09:00:00.000Z", location: "서울 마포구 망원", recentAgo: 9 * HOUR, fillRate: 48, viewCount: 5200, sampleSize: 4 },
  { id: "B-08", label: "연남 B-08", district: "마포구", center: { lat: 37.5631, lng: 126.9256 }, videoCount: 91, createdAt: "2026-07-14T09:00:00.000Z", durationSec: 132, location: "서울 마포구 연남", recentAgo: 40 * MINUTE, fillRate: 67, viewCount: 12000, sampleSize: 5 },
  { id: "C-02", label: "성수 C-02", district: "성동구", center: { lat: 37.5446, lng: 127.0559 }, videoCount: 205, createdAt: "2026-07-01T09:00:00.000Z", durationSec: 605, location: "서울 성동구 성수", recentAgo: 12 * MINUTE, fillRate: 88, viewCount: 24000, sampleSize: 5 },
  { id: "C-03", label: "건대입구 C-03", district: "성동구", center: { lat: 37.5402, lng: 127.0702 }, videoCount: 47, createdAt: "2026-06-20T09:00:00.000Z", durationSec: 47, location: "서울 성동구 건대입구", recentAgo: 1 * DAY, fillRate: 39, viewCount: 3100, sampleSize: 3 },
  { id: "D-01", label: "이태원 D-01", district: "용산구", center: { lat: 37.5346, lng: 126.9946 }, videoCount: 119, createdAt: "2026-07-12T09:00:00.000Z", durationSec: 210, location: "서울 용산구 이태원", recentAgo: 33 * MINUTE, fillRate: 71, viewCount: 15400, sampleSize: 5 },
  { id: "D-02", label: "한남 D-02", district: "용산구", center: { lat: 37.5344, lng: 127.0016 }, videoCount: 33, createdAt: "2026-06-15T09:00:00.000Z", location: "서울 용산구 한남", recentAgo: 3 * DAY, fillRate: 34, viewCount: 2200, sampleSize: 3 },
  { id: "E-05", label: "강남역 E-05", district: "강남구", center: { lat: 37.4979, lng: 127.0276 }, videoCount: 176, createdAt: "2026-07-08T09:00:00.000Z", durationSec: 366, location: "서울 강남구 강남역", recentAgo: 8 * MINUTE, fillRate: 82, viewCount: 31000, sampleSize: 5 },
  { id: "E-06", label: "역삼 E-06", district: "강남구", center: { lat: 37.5006, lng: 127.0364 }, videoCount: 88, createdAt: "2026-06-30T09:00:00.000Z", durationSec: 59, location: "서울 강남구 역삼", recentAgo: 4 * HOUR, fillRate: 59, viewCount: 7400, sampleSize: 4 },
  { id: "F-09", label: "잠실 F-09", district: "송파구", center: { lat: 37.5133, lng: 127.1 }, videoCount: 64, createdAt: "2026-07-11T09:00:00.000Z", durationSec: 148, location: "서울 송파구 잠실", recentAgo: 55 * MINUTE, fillRate: 52, viewCount: 6100, sampleSize: 4 },
  { id: "F-10", label: "송파 F-10", district: "송파구", center: { lat: 37.5145, lng: 127.106 }, videoCount: 21, createdAt: "2026-06-25T09:00:00.000Z", location: "서울 송파구 송파", recentAgo: 5 * DAY, fillRate: 27, viewCount: 1100, sampleSize: 2 },
  { id: "G-03", label: "종로 G-03", district: "종로구", center: { lat: 37.5729, lng: 126.9793 }, videoCount: 97, createdAt: "2026-07-13T09:00:00.000Z", durationSec: 302, location: "서울 종로구 종로", recentAgo: 18 * MINUTE, fillRate: 64, viewCount: 9800, sampleSize: 5 },
  { id: "G-04", label: "광화문 G-04", district: "종로구", center: { lat: 37.5716, lng: 126.9769 }, videoCount: 142, createdAt: "2026-07-03T09:00:00.000Z", durationSec: 75, location: "서울 종로구 광화문", recentAgo: 2 * HOUR, fillRate: 76, viewCount: 18700, sampleSize: 5 },
  { id: "H-11", label: "여의도 H-11", district: "영등포구", center: { lat: 37.5219, lng: 126.9245 }, videoCount: 58, createdAt: "2026-07-06T09:00:00.000Z", durationSec: 41, location: "서울 영등포구 여의도", recentAgo: 6 * HOUR, fillRate: 45, viewCount: 4600, sampleSize: 4 },
  { id: "H-12", label: "노량진 H-12", district: "영등포구", center: { lat: 37.5136, lng: 126.9425 }, videoCount: 12, createdAt: "2026-06-18T09:00:00.000Z", location: "서울 영등포구 노량진", recentAgo: 4 * DAY, fillRate: 19, viewCount: 640, sampleSize: 2 },
  // videoCount === 0 격자 — 상세 선택 no-op·카드 비활성(AC 2·3) 검증용
  { id: "I-01", label: "상암 I-01", district: "마포구", center: { lat: 37.5796, lng: 126.8895 }, videoCount: 0, createdAt: "2026-07-02T09:00:00.000Z", location: "서울 마포구 상암", recentAgo: 7 * DAY, fillRate: 0, viewCount: 0, sampleSize: 0 },
];

/**
 * 서울 일대 mock 격자 데이터.
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
