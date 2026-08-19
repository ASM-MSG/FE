import { useQueries } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getCellOptions } from "../../../shared/api/query-options";
import type { ApiResponseDtoGridCellResponseDto } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import { gridDisplayName } from "../model/home-grid-label";
import { entityQueryPolicy } from "../model/map-query-policy";

/**
 * 격자 표시명 일괄 조회 (MSG-427 E12·E-16, 승인 Q2) — `GET /api/grids/{gridId}`.
 * 웹 `use-grid-names-query.ts` 이식. 지도 SDK를 import하지 않는다.
 *
 * 코스 상세의 포토스팟 행이 `자갈치 B-07`처럼 사람이 읽는 이름을 보여야 하는데,
 * 미션 응답의 `spots`에는 좌표와 격자 id뿐이라 격자별로 이름을 받아온다.
 * 코스 하나의 스팟 수(6~8)만큼만 나가고 **코스 상세를 열었을 때만** 발사한다.
 * 조회 실패·무귀속이면 이름을 담지 않는다 — 뷰가 격자 코드로 폴백한다(E-16, 목 금지).
 */
export interface GridNamesResult {
  names: ReadonlyMap<string, string>;
  /** 하나라도 도착 전 — 로딩 중에 "이름 없는 경유 지점"을 거짓말하지 않게 게이트한다 */
  isPending: boolean;
}

export const useGridNamesQuery = (gridIds: string[]): GridNamesResult => {
  const { isAuthenticated } = useAuth();
  const active = isAuthenticated && gridIds.length > 0;

  const queries = useQueries({
    queries: gridIds.map((gridId) => ({
      ...getCellOptions({ path: { gridId } }),
      select: (envelope: ApiResponseDtoGridCellResponseDto) =>
        unwrapEnvelope(envelope),
      enabled: active,
      ...entityQueryPolicy,
    })),
  });

  const names = new Map<string, string>();
  for (const query of queries) {
    const cell = query.data;
    // 구역 밖 격자는 zoneName이 null이라 gridDisplayName이 행정동명으로 폴백한다.
    // 둘 다 없으면 gridId가 나오는데 그건 이름이 아니므로 담지 않는다 — 뷰가
    // "이름 없는 경유 지점"으로 분기할 수 있게 부재를 그대로 남긴다
    if (!cell) continue;
    const name = gridDisplayName(cell, cell.regionName);
    if (name !== cell.gridId) names.set(cell.gridId, name);
  }

  return {
    names,
    isPending: active && queries.some((query) => query.data === undefined),
  };
};
