import type { Cell, CellVideo } from "@/entities/cell";
import { themeCellsOf, type ThemeId } from "./theme";

/**
 * 테마 피드 파생 (MSG-277 AC 3·4) — 칩 클릭 시 좌측 패널에 뜨는 세로 1열 영상 피드의 표시 모델.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 */

/** 피드 영상 — 셀 영상 + 내 영상 판정 (AC 4 — 메타 문구 분기 근거) */
export interface ThemeFeedVideo extends CellVideo {
  mine: boolean;
}

/** 피드 셀 섹션 — 셀 라벨 헤더(AC 7) 아래 그 셀의 영상 카드들이 나열된다 */
export interface ThemeFeedSection {
  cellId: string;
  label: string;
  videos: ThemeFeedVideo[];
}

/** 테마 피드 표시 모델 — 헤더 배지·개수(AC 2) + 셀 섹션(AC 3·7) */
export interface ThemeFeed {
  theme: ThemeId;
  sections: ThemeFeedSection[];
  /** 피드에 실제 나열되는 영상 총수 — 셀 videoCount 집계가 아니라 표본 합 (AC 2, 추정 7) */
  totalCount: number;
}

/**
 * 활성 테마 → 피드 표시 모델. [AC 3·4]
 * - 섹션: 테마 강조 셀(themeCellsOf) 순서 — 경로추천은 경로 주변 셀 (AC 1 — 4테마 공통)
 * - 섹션 영상: 해당 셀 videos 업로드 최신순 (추정 2 — 테마 피드는 최신순, "내 영상 우선"은 셀 상세 전용)
 * - mine: 수집 영상 id 매칭 (AC 4)
 */
export const deriveThemeFeed = (
  theme: ThemeId,
  cells: Cell[],
  myVideoIds: number[],
): ThemeFeed => {
  const myVideoIdSet = new Set(myVideoIds);
  const sections = themeCellsOf(theme).flatMap<ThemeFeedSection>(({ id }) => {
    const cell = cells.find((c) => c.id === id);
    if (!cell) return []; // 테마 셀은 MOCK_CELLS와 동기화 보장(themeCellsFrom) — 풀 불일치 시 조용히 제외
    return [
      {
        cellId: cell.id,
        label: cell.label,
        videos: cell.videos
          .toSorted(
            (a, b) =>
              new Date(b.recordedAt).getTime() -
              new Date(a.recordedAt).getTime(),
          )
          .map((video) => ({
            ...video,
            mine: myVideoIdSet.has(video.videoId),
          })),
      },
    ];
  });

  return {
    theme,
    sections,
    totalCount: sections.reduce((sum, s) => sum + s.videos.length, 0),
  };
};
