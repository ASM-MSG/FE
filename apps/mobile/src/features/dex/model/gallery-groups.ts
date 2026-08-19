import type {
  CollectedVideo,
  GalleryGridGroup,
} from "../../../entities/dex/model/dex";
import { gridLabel } from "./grid-label";

/**
 * 지역별 갤러리 격자 그룹 파생 (MSG-425 L5) — 웹 `features/dex/model/gallery-groups.ts`
 * 포팅. 순수 함수 — RN·플랫폼 API에 의존하지 않는다.
 * 동등성은 `gallery-groups.parity.test.ts`가 웹 원본을 동적 import해 고정한다.
 */

/** 그룹의 최신 영상 시각 — 그룹 정렬 키 */
const latestCreatedAt = (list: CollectedVideo[]): string =>
  list.reduce((max, v) => (v.createdAt > max ? v.createdAt : max), "");

/**
 * 동 갤러리 영상을 격자별 그룹으로 나눈다. [L5]
 * - 그룹 안 영상은 createdAt 내림차순(최신순), 동률이면 videoId 오름차순 안정 정렬
 * - 그룹 순서는 그 격자의 최신 영상 시각 내림차순, 동률이면 gridId 오름차순
 * - 원본 배열은 변형하지 않는다
 */
export const groupVideosByGrid = (
  videos: CollectedVideo[],
  regionLabel: string,
): GalleryGridGroup[] => {
  const byGrid = new Map<string, CollectedVideo[]>();

  for (const video of videos) {
    const group = byGrid.get(video.gridId);
    if (group) group.push(video);
    else byGrid.set(video.gridId, [video]);
  }

  return [...byGrid.entries()]
    .map(([gridId, list]): GalleryGridGroup => {
      // Hermes 0.17(RN 0.86)에 Array.prototype.toSorted 미구현 — 스프레드 복사+sort가 안전 경로
      // react-doctor-disable-next-line js-tosorted-immutable
      const sorted = [...list].sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || a.videoId - b.videoId,
      );
      // 그룹 라벨 재료(zoneName·zoneCell)는 격자 단위 값이라 그룹 내 어느 항목이든 같다
      const head = sorted[0];
      return {
        gridId,
        label: gridLabel(head.zoneName, head.zoneCell, regionLabel),
        videos: sorted,
      };
    })
    .sort(
      (a, b) =>
        latestCreatedAt(b.videos).localeCompare(latestCreatedAt(a.videos)) ||
        a.gridId.localeCompare(b.gridId),
    );
};
