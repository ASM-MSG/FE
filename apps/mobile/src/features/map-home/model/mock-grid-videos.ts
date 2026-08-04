/**
 * 지도 홈·격자 썸네일 뷰 mock 데이터 — 부산 서면 기준 (사용자 결정 5, 서울 지명 금지).
 * 격자명은 웹 mock-cells label 관례("서면 A-14" 등)를 따른다.
 * 시트 요약 수치·목록은 현 뷰포트와 무관한 고정 mock (D5) — 뷰포트 연동 집계는 API 연동 시.
 * 영상 길이는 mock마다 다른 값 (D7 — Figma의 균일 "0:24"는 더미).
 */

export interface GridVideoSummary {
  id: string;
  /** 격자명 — 웹 mock-cells label 관례 (부산 서면 일대) */
  label: string;
  /** 격자에 쌓인 영상 수 — 인기순 정렬 키 */
  videoCount: number;
  /** 대표 영상 길이(초) — mm:ss 뱃지 표기용 */
  durationSec: number;
  /** 최신 영상 등록 시각(ISO) — 최신순 정렬 키 */
  registeredAt: string;
}

export const MOCK_GRID_VIDEOS: GridVideoSummary[] = [
  {
    id: "seomyeon-a-14",
    label: "서면 A-14",
    videoCount: 46,
    durationSec: 24,
    registeredAt: "2026-07-31T12:00:00+09:00",
  },
  {
    id: "jeonpo-a-15",
    label: "전포 A-15",
    videoCount: 38,
    durationSec: 17,
    registeredAt: "2026-08-02T09:30:00+09:00",
  },
  {
    id: "bujeon-b-07",
    label: "부전 B-07",
    videoCount: 29,
    durationSec: 30,
    registeredAt: "2026-07-28T18:45:00+09:00",
  },
  {
    id: "yangjeong-b-08",
    label: "양정 B-08",
    videoCount: 21,
    durationSec: 12,
    registeredAt: "2026-08-03T21:10:00+09:00",
  },
  {
    id: "beomcheon-i-01",
    label: "범천 I-01",
    videoCount: 17,
    durationSec: 26,
    registeredAt: "2026-07-25T15:20:00+09:00",
  },
  {
    id: "yeonsan-h-11",
    label: "연산 H-11",
    videoCount: 12,
    durationSec: 9,
    registeredAt: "2026-08-01T08:05:00+09:00",
  },
];

/** "이 지역 격자 N개 · 영상 M개" 요약의 N — mock 격자 수 (D5 고정 mock) */
export const MOCK_GRID_COUNT = MOCK_GRID_VIDEOS.length;

/** "이 지역 격자 N개 · 영상 M개" 요약의 M — mock 영상 수 합 (D5 고정 mock) */
export const MOCK_VIDEO_TOTAL = MOCK_GRID_VIDEOS.reduce(
  (sum, video) => sum + video.videoCount,
  0,
);
