import { useMemo } from "react";
import type { Bounds, LatLng } from "@/entities/cell";
import type {
  CourseView,
  MissionView,
} from "@/features/map-home/model/mission-view";
import type { ThemeId } from "@/features/map-home/model/theme";
import { useChipEntry } from "@/features/map-home/model/use-chip-entry";
import { useNearestEntry } from "@/features/map-home/model/use-nearest-entry";
import type { DisplayedRegion } from "@/features/region/model/region-panel-store";

/**
 * 칩 진입 배선 (MSG-451 — 페이지 300줄 분할).
 * 뷰-레이어 훅: 두 진입 훅(줌·확정 / 최근접 이동)을 순서대로 엮기만 한다.
 * 파생·판정은 각 model 훅이 소유하고 여기에는 조립만 남는다.
 *
 * 순서는 데이터로 강제된다 — `useChipEntry`가 진입이 정착한 칩을 반환하고 최근접 이동이 그것을
 * 기다리므로, 훅 등록 순서에 기대지 않고도 줌 → 이동 순서가 보장된다 (AC 12·13).
 */
interface HomeChipEntryInput {
  activeTheme: ThemeId | null;
  viewportBounds: Bounds | null;
  viewportCenter: LatLng | null;
  viewportZoom: number;
  currentRegion: DisplayedRegion | null;
  missionViews: MissionView[];
  courseViews: CourseView[];
  isRouteChip: boolean;
  /** 목록 조회 중 */
  listPending: boolean;
  /** 들고 있는 목록이 직전 확정 영역의 것인지 (keepPreviousData 한 박자) */
  listPlaceholder: boolean;
  zoomTo: (zoom: number) => void;
  moveTo: (coords: LatLng) => void;
  commit: (region: DisplayedRegion, bounds: Bounds | null) => void;
}

export const useHomeChipEntry = ({
  activeTheme,
  viewportBounds,
  viewportCenter,
  viewportZoom,
  currentRegion,
  missionViews,
  courseViews,
  isRouteChip,
  listPending,
  listPlaceholder,
  zoomTo,
  moveTo,
  commit,
}: HomeChipEntryInput): void => {
  // 칩 활성화 진입 — 칩에 맞는 줌으로 옮기고 그 화면을 1회 확정한다 (MSG-403 AC 6·9).
  // 반환값은 진입이 정착한 칩 — 최근접 이동이 이 신호를 기다린다 (MSG-451 검증 재작업 1·3)
  const settledChip = useChipEntry({
    activeTheme,
    bounds: viewportBounds,
    zoom: viewportZoom,
    region: currentRegion,
    zoomTo,
    commit,
  });

  // 칩의 대상 목록 — 경로추천은 코스, 축제·팝업은 미션
  const targets = useMemo(
    () => (isRouteChip ? courseViews : missionViews),
    [isRouteChip, courseViews, missionViews],
  );

  // 정착 뒤, 지도 중심에서 가장 가까운 대상으로 지도를 옮긴다 — 고르지는 않는다 (AC 13)
  useNearestEntry({
    activeTheme,
    settledChip,
    center: viewportCenter,
    targets,
    listSettled: !listPending && !listPlaceholder,
    moveTo,
  });
};
