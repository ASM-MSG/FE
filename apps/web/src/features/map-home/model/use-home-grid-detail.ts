import { useMemo } from "react";
import type { CollectionGridResponseDto } from "@/shared/api/generated";
import { formatMonthDay } from "@/shared/format";
import type { CourseSpot } from "./course";
import { gridContextLine } from "./grid-context-line";
import type { CellNameSource } from "./home-cell-detail";
import type { HourlyChart } from "./hourly-uploads";
import type { CourseView } from "./mission-view";
import type { ThemeId } from "./theme";
import {
  useGridDetailQuery,
  type GridDetailResult,
} from "./use-grid-detail-query";
import { useGridHourlyQuery } from "./use-grid-hourly-query";
import {
  useGridVideosQuery,
  type GridVideosResult,
} from "./use-grid-videos-query";

/**
 * 홈 격자 상세 조립 (MSG-395) — 상세·영상·시간대 3쿼리 + "어디서 내려왔는지" 맥락 줄.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 페이지에서 뽑아낸 이유(리뷰 반영 — 컴포넌트 300줄 초과): 쿼리 3개와 맥락 줄 파생이
 * 페이지 본문에 흩어져 있어, 격자 상세 하나를 고치려면 페이지 전체를 훑어야 했다.
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
  /** 내 수집 격자 조회 실패 — 방문·점령 여부를 주장하지 않게 한다 (리뷰 반영) */
  progressFailed: boolean;
  /**
   * 진입점 응답의 이름 재료 (MSG-474) — 비로그인은 `grids/{gridId}`가 사용자별 API
   * (익명 401)라 미발사하고, 여기서 선택 격자의 재료를 찾아 상세를 조립한다.
   * 현재 재료원은 핫구역 목록뿐 — 코스 스팟 응답은 좌표만 실려 gridId 폴백으로 진다
   */
  entryNamingSources: readonly CellNameSource[];
}

export interface HomeGridDetail {
  detail: GridDetailResult;
  videos: GridVideosResult;
  chart: HourlyChart;
  /** 배지 아래 한 줄 — 스팟 경로면 코스 맥락, 핫구역이면 점령 맥락, 그 외 없음 */
  contextLine: string | undefined;
  /** 선택 격자가 코스 스팟이면 그 스팟 — `코스 N번` 배지의 근거 */
  selectedSpot: CourseSpot | null;
}

export const useHomeGridDetail = ({
  selectedGridId,
  activeTheme,
  selectedCourse,
  collectedGrids,
  hotGridCount,
  progressFailed,
  entryNamingSources,
}: HomeGridDetailInput): HomeGridDetail => {
  const entryNaming = useMemo(
    () =>
      entryNamingSources.find((source) => source.gridId === selectedGridId) ??
      null,
    [entryNamingSources, selectedGridId],
  );
  const detail = useGridDetailQuery(selectedGridId, activeTheme, entryNaming);
  const videos = useGridVideosQuery(selectedGridId);
  const { chart } = useGridHourlyQuery(selectedGridId);

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

  return { detail, videos, chart, contextLine, selectedSpot };
};
