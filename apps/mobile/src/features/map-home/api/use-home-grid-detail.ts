import { useMemo } from "react";
import type { CollectionGridResponseDto } from "../../../shared/api/sdk";
import { formatMonthDay } from "../../../shared/format";
import type { CourseSpot } from "../model/course";
import { gridContextLine } from "../model/grid-context-line";
import type { CourseView } from "../model/mission-view";
import type { ThemeId } from "../model/themes";
import {
  useGridDetailQuery,
  type GridDetailResult,
} from "./use-grid-detail-query";
import {
  useGridVideosQuery,
  type GridVideosResult,
} from "./use-grid-videos-query";

/**
 * 홈 격자 상세 조립 (MSG-427 C1·C6·C7) — 웹 `use-home-grid-detail.ts` 미러.
 * 상세·영상 2쿼리 + "어디서 내려왔는지" 맥락 줄.
 * 지도 SDK·라우터를 import하지 않는다(RN 경계).
 *
 * 활발한 시간대는 여기 없다 — Figma·티켓이 그래프를 **동 요약**에 두므로
 * `use-hot-region-summary`가 갖는다 (승인 Q3, 웹과 갈리는 지점).
 */
interface HomeGridDetailInput {
  selectedGridId: string | null;
  activeTheme: ThemeId | null;
  /** 상세를 연 코스 — 스팟 경로로 내려왔는지 판정한다 */
  selectedCourse: CourseView | null;
  /** 내 수집 격자 원본 — 점령 시작일(`firstCollectedAt`)의 출처 */
  collectedGrids: CollectionGridResponseDto[];
  /** 이 동의 핫구역 격자 수 — `핫구역 안 N칸` 문구의 근거 */
  hotGridCount: number;
  /** 진행도·수집 격자 조회 실패 — 방문·점령 여부를 주장하지 않게 한다 (C7) */
  progressFailed: boolean;
}

export interface HomeGridDetail {
  detail: GridDetailResult;
  videos: GridVideosResult;
  /** 배지 아래 한 줄 — 스팟 경로면 코스 맥락, 핫구역이면 점령 맥락, 그 외 없음 */
  contextLine: string | undefined;
  /** 선택 격자가 코스 스팟이면 그 스팟 — `코스 N번` 배지의 근거 (E13) */
  selectedSpot: CourseSpot | null;
}

export const useHomeGridDetail = ({
  selectedGridId,
  activeTheme,
  selectedCourse,
  collectedGrids,
  hotGridCount,
  progressFailed,
}: HomeGridDetailInput): HomeGridDetail => {
  const detail = useGridDetailQuery(selectedGridId, activeTheme);
  const videos = useGridVideosQuery(selectedGridId);

  const collectedGrid = useMemo(
    () => collectedGrids.find((grid) => grid.gridId === selectedGridId) ?? null,
    [collectedGrids, selectedGridId],
  );
  const selectedSpot = useMemo(
    () =>
      selectedCourse?.spots.find((spot) => spot.gridId === selectedGridId) ??
      null,
    [selectedCourse, selectedGridId],
  );

  const contextLine = useMemo(
    () =>
      gridContextLine({
        spot: selectedSpot,
        courseTitle: selectedCourse?.title,
        isHotChip: activeTheme === "hot",
        hotGridCount,
        collectedSinceLabel: collectedGrid
          ? `${formatMonthDay(collectedGrid.firstCollectedAt)}부터 내가 점령 중`
          : null,
        progressFailed,
      }),
    [
      selectedSpot,
      selectedCourse,
      activeTheme,
      hotGridCount,
      collectedGrid,
      progressFailed,
    ],
  );

  return { detail, videos, contextLine, selectedSpot };
};
