import { cellCenterAt } from "../../../entities/cell/model/grid-5179";
import type { LatLng } from "../../../entities/cell/model/grid";
import type { RegionExploreResponseDto } from "../../../shared/api/sdk";

/**
 * 지역 선택 → 지도 이동 목적지 (MSG-578, A1 번복 — "지도도 옮겨야") — 순수 함수.
 * 지역 API에는 좌표가 없어 시트용 격자 목록(`GET /api/regions/{code}/grids`)의 첫 격자(최신순)
 * 중심을 쓴다. 이동하지 않는 경우: 목록 미도착·빈 목록, 다른 지역의 목록(regionCode 에코 불일치),
 * 이미 이 지역으로 이동한 뒤(지역당 1회).
 */
export const regionFocusTarget = (
  data: RegionExploreResponseDto | undefined,
  selectedRegionCode: string,
  movedRegionCode: string | null,
): LatLng | null => {
  const first = data?.grids[0];
  if (
    !first ||
    data.regionCode !== selectedRegionCode ||
    movedRegionCode === selectedRegionCode
  )
    return null;
  return cellCenterAt({ gridX: first.gridX, gridY: first.gridY });
};
