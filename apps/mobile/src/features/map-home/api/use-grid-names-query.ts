import { useQueries } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getCellOptions } from "../../../shared/api/query-options";
import type { ApiResponseDtoGridCellResponseDto } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import { entityQueryPolicy } from "../model/map-query-policy";
import { deriveGridNames, type GridNamesResult } from "./grid-names-query";

/**
 * 격자 표시명 일괄 조회 (MSG-427 E12·E-16, 승인 Q2) — `GET /api/grids/{gridId}`.
 * 웹 `use-grid-names-query.ts` 이식. 지도 SDK를 import하지 않는다.
 *
 * 코스 상세의 포토스팟 행이 `자갈치 B-07`처럼 사람이 읽는 이름을 보여야 하는데,
 * 미션 응답의 `spots`에는 좌표와 격자 id뿐이라 격자별로 이름을 받아온다.
 * 코스 하나의 스팟 수(6~8)만큼만 나가고 **코스 상세를 열었을 때만** 발사한다.
 * 조회 실패·무귀속이면 이름을 담지 않는다 — 뷰가 격자 코드로 폴백한다(E-16, 목 금지).
 *
 * 이름 파생과 로딩 게이트는 `grid-names-query.ts`(순수)가 갖고 그쪽이 테스트 대상이다
 * (MSG-428 `grid-aggregation-query` 선례) — 이 파일은 `auth-session`이 파싱 단계에서
 * expo-secure-store를 끌고 와 vitest에서 열리지 않는다.
 */
export type { GridNamesResult };

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

  return deriveGridNames(queries, active);
};
