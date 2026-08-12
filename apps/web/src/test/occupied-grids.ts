import { encodeGridId } from "@/entities/cell";
import { MOCK_DEX } from "@/entities/dex";
import type { OccupiedGridResponseDto } from "@/shared/api/generated";

/**
 * 점령 격자 응답 픽스처 (MSG-325) — 목 도감 수집 격자의 center를 서버 격자 체계로 인코딩한 것.
 * 오버레이 파생 테스트 2곳(grid-overlay·cluster-overlay)이 공유한다.
 */
/** gridId 하나로 점령 격자 응답 항목을 만든다 — 구역 밖(zone 쌍 null) 기본 */
export const occupiedGridOf = (gridId: string): OccupiedGridResponseDto => {
  const [gridY, gridX] = gridId.split("_").map(Number);
  return {
    gridId,
    gridY,
    gridX,
    zoneName: null,
    zoneCell: null,
    regionName: null,
  };
};

export const MOCK_OCCUPIED_GRIDS: OccupiedGridResponseDto[] =
  MOCK_DEX.collectedCells.map(({ center }) =>
    occupiedGridOf(encodeGridId(center)),
  );
