import { useQuery } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import {
  getCellOptions,
  getStatByGridOptions,
} from "../../../shared/api/query-options";
import { useAuth } from "../../auth/model/auth-session";
import {
  deriveHomeCellDetail,
  type HomeCellDetail,
} from "../model/home-cell-detail";
import type { GatedQueryStatus } from "../model/home-sheet-state";
import { entityQueryPolicy } from "../model/map-query-policy";
import type { ThemeId } from "../model/themes";

/**
 * 격자 상세 조회 (MSG-427 C1·C3·C4·C5·C11) — `GET /api/grids/{gridId}` + 행정동
 * (`GET /api/regions/stats/by-grid`). 웹 `use-grid-detail-query.ts` 이식.
 * 지도 SDK를 import하지 않는다.
 *
 * 격자 조회만 필수다 — 행정동은 없어도 상세가 성립한다(위치 줄만 빠진다, C11).
 * 명세는 `by-grid`가 무귀속일 때 `200 + data: null`을 주는데 생성 타입이 non-null이라
 * 런타임 null을 `?? null`로 흡수한다.
 */
export interface GridDetailResult extends GatedQueryStatus {
  detail: HomeCellDetail | null;
}

export const useGridDetailQuery = (
  gridId: string | null,
  activeTheme: ThemeId | null,
): GridDetailResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const active = isAuthenticated && gridId !== null;
  const path = { gridId: gridId ?? "" };

  const cell = useQuery({
    ...getCellOptions({ path }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });
  const stat = useQuery({
    ...getStatByGridOptions({ query: { gridId: gridId ?? "" } }),
    select: unwrapEnvelope,
    enabled: active,
    ...entityQueryPolicy,
  });

  return {
    detail: cell.data
      ? deriveHomeCellDetail({
          cell: cell.data,
          regionName: stat.data?.regionName ?? null,
          activeTheme,
        })
      : null,
    isError: cell.isError,
    // 행정동은 선택 정보라 도착을 기다리지 않는다 — 격자 응답만으로 상세가 성립한다
    isResolved: (!active && hydrated) || cell.data !== undefined,
    retry: () => {
      if (!active) return;
      void cell.refetch();
      void stat.refetch();
    },
  };
};
