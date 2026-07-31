import type { CellVideo } from "@/entities/cell";

/**
 * 업로드 시각 3시간×8버킷 집계 (MSG-277 2차 AC 9 — 활발한 시간대 그래프 데이터).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 */

/** 시간대 버킷 — startHour ∈ {0,3,…,21}, 구간은 [startHour, startHour+3) 로컬 시각 */
export interface UploadHourBucket {
  startHour: number;
  count: number;
}

const BUCKET_HOURS = 3;
const BUCKET_COUNT = 24 / BUCKET_HOURS;

/**
 * 영상들의 uploadedAt 로컬 시각을 3시간 단위 8버킷(0–3시 … 21–24시)으로 집계한다.
 * 각 영상은 자기 시각 버킷에 정확히 1회 — 버킷 count 합 = videos.length, 빈 표본이면 전 버킷 0.
 */
export const deriveUploadHourBuckets = (
  videos: CellVideo[],
): UploadHourBucket[] => {
  const buckets: UploadHourBucket[] = Array.from(
    { length: BUCKET_COUNT },
    (_, i) => ({ startHour: i * BUCKET_HOURS, count: 0 }),
  );
  for (const video of videos) {
    const hour = new Date(video.uploadedAt).getHours();
    buckets[Math.floor(hour / BUCKET_HOURS)].count += 1;
  }
  return buckets;
};
