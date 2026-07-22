import type { CollectedVideo } from "@/entities/dex";

interface GalleryThumbnailProps {
  video: CollectedVideo;
  /** 타일 클릭 — 소속 격자 상세 시트 열기 배선은 부모(DexPanel) 몫 (AC 23) */
  onClick: (video: CollectedVideo) => void;
}

/**
 * 갤러리 썸네일 타일 (MSG-122 AC 10·13, ② AC 23·25) — 정사각(aspect-square) 대표 프레임 button.
 * 클릭·Enter(네이티브 button)로 해당 영상의 격자 상세를 연다 — ② 개정으로 비인터랙티브 결정이
 * 번복됐고, 실제 재생만 후속(no-op)이다. 접근 가능한 이름은 격자 라벨 포함 aria-label이 제공하며
 * (기존 alt 문구 승계) 이미지·placeholder 두 경로 공통이다 (AC 10 ② — img alt는 비워 중복 방지).
 * thumbnailSrc 없으면 bg-surface placeholder 타일(ui-web VideoRow 관례).
 * 첫 등장이라 로컬 구현 — 2번째 사용처 등장 시 ui-web 승격 검토 (스펙 승격 후보).
 */
export const GalleryThumbnail = ({ video, onClick }: GalleryThumbnailProps) => (
  <button
    type="button"
    aria-label={`${video.cellLabel} 수집 영상`}
    onClick={() => onClick(video)}
    className="block w-full transition-[filter] active:brightness-[0.86]"
  >
    {video.thumbnailSrc ? (
      <img
        src={video.thumbnailSrc}
        alt=""
        className="aspect-square w-full rounded-sm bg-surface object-cover"
      />
    ) : (
      <span className="block aspect-square w-full rounded-sm bg-surface" />
    )}
  </button>
);
