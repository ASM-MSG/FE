/**
 * 핫구역 행정동 요약 파생 (MSG-427 B4·B5) — 웹
 * `features/map-home/model/hot-region-summary.ts`의 복제본.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 * 동등성은 hot-region-summary.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 *
 * 동 단위 "전체 영상" API가 없다(`/api/collections/videos`는 내 수집분 전용) —
 * 그 동의 핫구역 격자 중 **핫스코어 상위 몇 개**의 전역 영상을 합쳐 표본으로 삼는다.
 * 스탯은 이 표본 기준이며, 서버 집계가 생기면 여기만 교체한다.
 * 표본 성격을 화면에 알리지 않는 것은 승인 결정 Q7(웹·Figma와 동일)이다.
 */

/** 요약 표본으로 조회할 격자 수 상한 — 요청 수를 격자 수에 비례시키지 않기 위한 눈금 */
export const HOT_SAMPLE_GRID_LIMIT = 5;

/** 핫스코어 내림차순 상위 격자 id — 표본 조회 대상. [B5] */
export const hotZoneSampleGridIds = (
  hotZones: { gridId: string; score: number }[],
  limit: number,
): string[] =>
  // Hermes(RN 0.86)에 Array.prototype.toSorted 미구현 — 스프레드 복사+sort가 안전 경로
  [...hotZones]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((zone) => zone.gridId);

/** 요약 스탯 — 헤더 두 줄(`내 영상 N개 · 최근 24시간 영상 +N개` / `영상 N개 · 조회 N`) */
export interface HotRegionStats {
  videoCount: number;
  viewCount: number;
  recentCount: number;
  myVideoCount: number;
}

/** 최근으로 세는 구간(ms) */
const RECENT_WINDOW_MS = 86_400_000;

interface HotRegionStatsInput {
  /** 표본 영상 — 조회수는 목록 DTO에 없을 수 있어 null 허용 (grid-videos 계약) */
  videos: { recordedAt: string; viewCount: number | null }[];
  /** 그 동에서 내가 수집한 영상 수 — `/api/collections/videos` 길이 */
  myVideoCount: number;
  now: Date;
}

/**
 * 표본 영상 → 요약 스탯. [B4]
 * 조회수를 못 구한 영상(내 영상 목록 DTO는 viewCount가 없다)은 합계에서 빼고,
 * 영상 수에는 그대로 센다 — 개수는 알지만 조회수는 모르는 상태를 그대로 반영한다.
 */
export const deriveHotRegionStats = ({
  videos,
  myVideoCount,
  now,
}: HotRegionStatsInput): HotRegionStats => {
  const since = now.getTime() - RECENT_WINDOW_MS;

  return {
    videoCount: videos.length,
    viewCount: videos.reduce((sum, video) => sum + (video.viewCount ?? 0), 0),
    recentCount: videos.filter(
      (video) => new Date(video.recordedAt).getTime() >= since,
    ).length,
    myVideoCount,
  };
};
