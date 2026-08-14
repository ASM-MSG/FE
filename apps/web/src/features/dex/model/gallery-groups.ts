import type { CollectedVideo, GalleryGridGroup } from "@/entities/dex";
import { gridCardLabel } from "@/features/region/model/grid-card";

/**
 * 지역별 갤러리 격자 그룹 파생 (MSG-327 기준 12).
 * 순수 함수 — 지도 SDK/플랫폼(window·router)에 의존하지 않는다(RN 재사용 대상).
 * 격자 라벨 조합은 MSG-328에서 확립한 `gridCardLabel`을 그대로 쓴다 — 홈 격자 카드와
 * 도감 갤러리가 같은 규칙(zoneName+zoneCell, 구역 밖이면 상위 행정동)으로 격자를 부른다.
 */

/**
 * 동 갤러리 영상을 격자별 그룹으로 나눈다. [기준 12]
 * - 그룹 안 영상은 createdAt 내림차순(최신순), 동률이면 videoId 오름차순 안정 정렬
 * - 그룹 순서는 그 격자의 최신 영상 시각 내림차순
 * - 원본 배열은 변형하지 않는다
 */
export const groupVideosByGrid = (
  videos: CollectedVideo[],
  regionName: string,
): GalleryGridGroup[] => {
  const byGrid = new Map<string, CollectedVideo[]>();

  for (const video of videos) {
    const group = byGrid.get(video.gridId);
    if (group) group.push(video);
    else byGrid.set(video.gridId, [video]);
  }

  const latest = (list: CollectedVideo[]) =>
    list.reduce((max, v) => (v.createdAt > max ? v.createdAt : max), "");

  return [...byGrid.entries()]
    .map(([gridId, list]): GalleryGridGroup => {
      const sorted = [...list].sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || a.videoId - b.videoId,
      );
      // 그룹 라벨 재료(zoneName·zoneCell)는 격자 단위 값이라 그룹 내 어느 항목이든 같다
      const head = sorted[0];
      return {
        gridId,
        label: gridCardLabel(head.zoneName, head.zoneCell, regionName),
        videos: sorted,
      };
    })
    .sort(
      (a, b) =>
        latest(b.videos).localeCompare(latest(a.videos)) ||
        a.gridId.localeCompare(b.gridId),
    );
};
