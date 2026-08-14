import { useMemo } from "react";
import { decodeGridCenter, type Bounds } from "@/entities/cell";
import { useRegionVideosQuery } from "@/features/dex/model/use-region-videos-query";
import type { GridFeedItem } from "./grid-videos";
import {
  deriveHotRegionStats,
  hotZoneSampleGridIds,
  HOT_SAMPLE_GRID_LIMIT,
  type HotRegionStats,
} from "./hot-region-summary";
import type { ThemeCell } from "./theme";
import { useHotZones } from "./use-hotzones-query";
import { useMultiGridVideosQuery } from "./use-multi-grid-videos-query";

/**
 * 핫구역 행정동 요약 조합 훅 (MSG-395 AC 8~10).
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 행정동은 **인자로 받는다** — 판별(reverse-geocode)은 이미 홈이 소유하고 있고
 * (RegionPanel과 같은 캐시), 여기서 다시 부르면 디바운스 타이밍이 두 벌로 갈린다.
 */
interface HotRegionSummaryInput {
  bounds: Bounds | null;
  /** 현재 행정동명 — 핫구역을 이 동으로 좁히는 기준. 미판별이면 null */
  regionName: string | null;
  /** 현재 행정동 코드 — 내 수집 영상 수 조회 키 */
  regionCode: string | null;
}

export interface HotRegionSummaryResult {
  /** 이 동의 핫구역 격자 id — 지도 강조 대상이자 "핫구역 안 N칸"의 근거 */
  hotGridIds: string[];
  /** 오버레이 입력 — 기존 테마 셀 파이프라인(buildHomeOverlayCells)이 소비한다 */
  cells: ThemeCell[];
  /** 표본 영상 피드 (상위 격자 합본, 최신순) */
  videos: GridFeedItem[];
  stats: HotRegionStats;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

export const useHotRegionSummary = ({
  bounds,
  regionName,
  regionCode,
}: HotRegionSummaryInput): HotRegionSummaryResult => {
  const hotZones = useHotZones(bounds);

  // 뷰포트 응답을 현재 행정동으로 좁힌다 — 칩은 "이 동의 핫구역"을 보여준다 (AC 8).
  // useMemo 필수 (리뷰 반영): 여기서 나온 배열이 소비처(MapHomePage)의 오버레이 파생
  // 의존성이라, 매 렌더 새 참조면 미니 패널 토글 같은 무관한 리렌더마다 오버레이가
  // clear→재게시된다. `useHotZoneCells`가 같은 이유로 이미 메모하고 있다
  const regionZones = useMemo(
    () =>
      regionName === null
        ? []
        : hotZones.zones.filter((zone) => zone.regionName === regionName),
    [hotZones.zones, regionName],
  );

  const sampleGridIds = useMemo(
    () => hotZoneSampleGridIds(regionZones, HOT_SAMPLE_GRID_LIMIT),
    [regionZones],
  );
  const hotGridIds = useMemo(
    () => regionZones.map((zone) => zone.gridId),
    [regionZones],
  );
  const cells = useMemo(
    () =>
      regionZones.map((zone) => ({
        id: zone.gridId,
        center: decodeGridCenter(zone.gridId),
      })),
    [regionZones],
  );
  const sample = useMultiGridVideosQuery(sampleGridIds);
  const myVideos = useRegionVideosQuery(regionCode);

  return {
    hotGridIds,
    cells,
    videos: sample.items,
    stats: deriveHotRegionStats({
      videos: sample.items,
      myVideoCount: myVideos.data?.length ?? 0,
      now: new Date(),
    }),
    // 핫구역 조회 자체의 상태를 함께 본다 (codex 리뷰 반영) — 빼먹으면 핫구역이 실패해도
    // 표본 조회가 (대상 0건이라) 성공으로 끝나 "영상이 없어요"가 뜬다
    isPending: hotZones.isPending || sample.isPending || myVideos.isPending,
    isError: hotZones.isError || sample.isError || myVideos.isError,
    retry: () => {
      hotZones.retry();
      sample.retry();
      myVideos.retry();
    },
  };
};
