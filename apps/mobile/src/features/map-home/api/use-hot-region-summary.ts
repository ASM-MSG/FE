import { useMemo } from "react";
import { useRegionVideosQuery } from "../../dex/model/use-region-videos-query";
import { deriveSheetState, type SheetState } from "../model/home-sheet-state";
import type { GridFeedItem } from "../model/grid-videos";
import {
  HOT_SAMPLE_GRID_LIMIT,
  deriveHotRegionStats,
  hotZoneSampleGridIds,
  type HotRegionStats,
} from "../model/hot-region-summary";
import type { HourlyChart } from "../model/hourly-uploads";
import type { Bounds } from "../../../entities/cell/model/grid";
import { useHotZonesQuery } from "./use-hotzones-query";
import { useMultiGridHourlyQuery } from "./use-multi-grid-hourly-query";
import { useMultiGridVideosQuery } from "./use-multi-grid-videos-query";

/**
 * 핫구역 행정동 요약 조립 (MSG-427 B1~B9) — 웹
 * `features/map-home/model/use-hot-region-summary.ts` 미러.
 * 지도 SDK·라우터를 import하지 않는다(RN 경계).
 *
 * 행정동은 **인자로 받는다** — 판별(reverse-geocode)은 이미 홈이 소유하고 있고,
 * 여기서 다시 부르면 디바운스 타이밍이 두 벌로 갈린다.
 */
interface HotRegionSummaryInput {
  bounds: Bounds | null;
  /** 현재 행정동명 — 핫구역을 이 동으로 좁히는 기준. 미판별이면 null (B1) */
  regionName: string | null;
  /** 현재 행정동 코드 — 내 수집 영상 수 조회 키 */
  regionCode: string | null;
}

export interface HotRegionSummaryResult {
  /** 이 동의 핫구역 격자 id — 지도 강조 대상이자 `핫구역 안 N칸`의 근거 */
  hotGridIds: string[];
  /** 표본 영상 피드 (상위 격자 합본, 최신순) */
  videos: GridFeedItem[];
  stats: HotRegionStats;
  /** 활발한 시간대 — 상위 5격자 합산 (B9·B-11, 승인 Q3) */
  chart: HourlyChart;
  state: SheetState;
  isError: boolean;
  retry: () => void;
}

export const useHotRegionSummary = ({
  bounds,
  regionName,
  regionCode,
}: HotRegionSummaryInput): HotRegionSummaryResult => {
  const hotZones = useHotZonesQuery(bounds);

  // 뷰포트 응답을 현재 행정동으로 좁힌다 — 칩은 "이 동의 핫구역"을 보여준다 (B1).
  // useMemo 필수: 여기서 나온 배열이 지도 오버레이 파생의 의존성이라, 매 렌더 새 참조면
  // 무관한 리렌더마다 폴리곤이 다시 만들어진다
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

  const sample = useMultiGridVideosQuery(sampleGridIds);
  const hourly = useMultiGridHourlyQuery(sampleGridIds);
  const myVideos = useRegionVideosQuery(regionCode);

  const stats = deriveHotRegionStats({
    videos: sample.items,
    myVideoCount: myVideos.data?.length ?? 0,
    now: new Date(),
  });

  return {
    hotGridIds,
    videos: sample.items,
    stats,
    chart: hourly.chart,
    // 핫구역 조회 자체의 상태를 함께 본다 — 빼먹으면 핫구역이 실패해도 표본 조회가
    // (대상 0건이라) 성공으로 끝나 "영상이 없어요"가 뜬다
    state: deriveSheetState(
      [
        hotZones,
        sample,
        { isError: myVideos.isError, isResolved: !myVideos.isPending },
      ],
      sample.items.length,
    ),
    isError: hotZones.isError || sample.isError || myVideos.isError,
    retry: () => {
      hotZones.retry();
      sample.retry();
      myVideos.retry();
    },
  };
};
