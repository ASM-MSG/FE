import type { CollectedVideo } from "@/entities/dex";

interface GalleryThumbnailProps {
  video: CollectedVideo;
}

/**
 * 갤러리 썸네일 타일 (MSG-122 AC 10·13) — 정사각(aspect-square) 대표 프레임.
 * 비인터랙티브 — 재생·상세는 제외 범위(후속 티켓)라 클릭 핸들러·button 역할을 두지 않는다.
 * thumbnailSrc 없으면 bg-surface placeholder 타일(ui-web VideoRow 관례) —
 * 두 경로 모두 격자 라벨을 포함한 대체 텍스트를 제공한다 (AC 10).
 * 첫 등장이라 로컬 구현 — 2번째 사용처 등장 시 ui-web 승격 검토 (스펙 승격 후보).
 */
export const GalleryThumbnail = ({ video }: GalleryThumbnailProps) => {
  const alt = `${video.cellLabel} 수집 영상`;
  return video.thumbnailSrc ? (
    <img
      src={video.thumbnailSrc}
      alt={alt}
      className="aspect-square w-full rounded-sm bg-surface object-cover"
    />
  ) : (
    <span
      role="img"
      aria-label={alt}
      className="block aspect-square w-full rounded-sm bg-surface"
    />
  );
};
