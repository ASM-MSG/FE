import { useQueries } from "@tanstack/react-query";
import type { ApiResponseDtoGridCellResponseDto } from "@/shared/api/generated";
import { getCellOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { gridDisplayName } from "./grid-label";
import { entityQueryPolicy } from "./map-query-policy";

/**
 * 격자 표시명 일괄 조회 (MSG-395 AC 23) — `GET /api/grids/{gridId}`.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 코스 상세의 포토스팟 행이 `자갈치 B-07`처럼 사람이 읽는 이름을 보여야 하는데,
 * 미션 응답의 `spots`에는 좌표와 격자 id뿐이라 격자별로 이름을 받아온다.
 * 코스 하나의 스팟 수(6~8)만큼만 나가고 **코스 상세를 열었을 때만** 발사한다.
 */
export interface GridNamesResult {
  names: ReadonlyMap<string, string>;
  /** 하나라도 도착 전 — 코스 상세가 "이름 없는 경유 지점"을 로딩 중에 거짓말하지 않게 게이트한다 */
  isPending: boolean;
}

export const useGridNamesQuery = (gridIds: string[]): GridNamesResult => {
  const queries = useQueries({
    queries: gridIds.map((gridId) => ({
      ...getCellOptions({ path: { gridId } }),
      select: (envelope: ApiResponseDtoGridCellResponseDto) =>
        unwrapEnvelope(envelope),
      ...entityQueryPolicy,
    })),
  });

  const names = new Map<string, string>();
  for (const query of queries) {
    const cell = query.data;
    // 구역 밖 격자는 zoneName이 null이라 gridDisplayName이 행정동명으로 폴백한다.
    // 둘 다 없으면 gridId가 나오는데, 그건 이름이 아니므로 담지 않는다 — 뷰가
    // "이름 없는 경유 지점"으로 분기할 수 있게 부재를 그대로 남긴다
    if (!cell) continue;
    const name = gridDisplayName(cell, cell.regionName);
    if (name !== cell.gridId) names.set(cell.gridId, name);
  }

  return { names, isPending: queries.some((query) => query.isPending) };
};
