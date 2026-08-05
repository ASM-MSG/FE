/**
 * 갤러리 스코프 모델 (MSG-300 AC 2·3) — 갤러리 화면은 하나, 스코프로 지역/전체를
 * 가른다. 스코프 상태는 화면 로컬·비영속 (추정 7 — dex-tab 칩 상태와 동일 원칙).
 */
import { formatVideoCount } from "./collection-format";
import type { GalleryVideo } from "./mock-gallery";

export type GalleryScope =
  | { mode: "all" }
  | { mode: "region"; regionName: string };

/** 스코프 필터 — region이면 해당 지역만, all이면 전체를 원본 순서로 (AC 2) */
export const filterGalleryVideos = (
  videos: readonly GalleryVideo[],
  scope: GalleryScope,
): readonly GalleryVideo[] =>
  scope.mode === "region"
    ? videos.filter((video) => video.regionName === scope.regionName)
    : videos;

/** 부제 — "부산진구 서면 · 영상 12개" / "전체 · 영상 19개" (AC 3) */
export const formatGallerySubtitle = (
  scope: GalleryScope,
  count: number,
): string => {
  const scopeLabel = scope.mode === "region" ? scope.regionName : "전체";
  return `${scopeLabel} · ${formatVideoCount(count)}`;
};
