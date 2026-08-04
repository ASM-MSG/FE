import type { GridVideoSummary } from "./mock-grid-videos";

/** 정렬 칩 종류 — 인기순·최신순 (AC 14) */
export type GridVideoSort = "popular" | "latest";

/**
 * 격자 영상 목록 정렬 (AC 4).
 * popular = 영상 수 내림차순, latest = 최신 등록순(등록 시각 내림차순).
 * 원본을 변경하지 않고 새 배열을 반환한다.
 */
export const sortGridVideos = (
  videos: GridVideoSummary[],
  sort: GridVideoSort,
): GridVideoSummary[] =>
  // Hermes 0.17(RN 0.86)에 Array.prototype.toSorted 미구현 — 사용 시 런타임 크래시. 스프레드 복사+sort가 안전 경로
  // react-doctor-disable-next-line js-tosorted-immutable
  [...videos].sort((a, b) =>
    sort === "popular"
      ? b.videoCount - a.videoCount
      : Date.parse(b.registeredAt) - Date.parse(a.registeredAt),
  );
