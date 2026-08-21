import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { gatedQueryStatus } from "../../../shared/api/gated-query-status";
import { useAuth } from "../../auth/model/auth-session";
import type { RegionClusterMarker } from "../model/region-cluster-overlay";
import { useSelectedTheme } from "../model/theme-selection";
import type { Viewport } from "../model/viewport";
import { GRID_MIN_ZOOM } from "../model/visible-grid";
import {
  gridAggregationQueryArgs,
  gridAggregationQueryOptions,
  selectAggregationItems,
  toClusterMarkers,
} from "./grid-aggregation-query";

/**
 * 저줌 지역 집계 조회 훅 (MSG-428) — 상태 3종(인증·테마·뷰포트)을 읽어 옵션 팩토리에
 * 넘기고, 응답을 지도에 게시할 마커까지 파생해 돌려주는 얇은 층이다. 게이트 판정·요청
 * 인자 조립·직전 데이터 유지·마커 합성은 전부 `grid-aggregation-query.ts`(순수)에 있고
 * 그쪽이 테스트 대상이다 — 이 파일은 `auth-session`이 파싱 단계에서 expo-secure-store를
 * 끌고 와 vitest에서 열리지 않는다 (MSG-426 "옵션 팩토리 + 얇은 훅" 구조).
 *
 * 마커 파생(useMemo)을 화면이 아니라 여기 둔 이유: 지도 홈 화면은 MSG-427과 같은 파일을
 * 병렬로 고치고 있어 이 티켓의 화면 diff를 10줄 이내로 묶기로 했다(수용 기준 G3).
 * 화면은 훅 호출 한 줄과 prop 배선만 남는다.
 *
 * 실패 상태는 `shared/api/gated-query-status`(2인자, 웹 parity 판)로 파생한다 —
 * 모바일에 동명 3인자 구현(`model/home-sheet-state`)이 하나 더 있으나 그쪽은 시트 상태
 * 전용이고, 집계 실패는 시트에 넣지 않는다(승인 Q7: 지도 위 Toast 오버레이).
 */
export interface GridAggregationResult {
  /** 지도에 게시할 지역 집계 마커 — 게이트가 닫혔거나 개별 격자 줌이면 빈 배열 */
  clusters: RegionClusterMarker[];
  isError: boolean;
  retry: () => void;
}

export const useGridAggregationQuery = (
  viewport: Viewport | null,
): GridAggregationResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const themeActive = useSelectedTheme() !== null;
  // 지도 준비 전(뷰포트 null)에는 격자 줌을 넣어 단위 미판정(null) 상태로 둔다 —
  // 어차피 bounds가 null이라 발사되지 않지만, 단위가 임의로 정해지지 않게 한다
  const zoom = viewport?.zoom ?? GRID_MIN_ZOOM;
  const gate = {
    bounds: viewport?.bounds ?? null,
    zoom,
    isAuthenticated,
    hydrated,
    themeActive,
  };
  const { unit, enabled } = gridAggregationQueryArgs(gate);

  const query = useQuery(gridAggregationQueryOptions(gate));
  const { isError, retry } = gatedQueryStatus(query, enabled);
  const items = selectAggregationItems(enabled, query.data);
  const clusters = useMemo(
    () => toClusterMarkers(items, unit, zoom),
    [items, unit, zoom],
  );

  return {
    clusters,
    // 게이트가 닫힌 뒤에도 마지막 실패는 쿼리에 남는다 — 격자 줌으로 복귀했거나 칩을
    // 켠 화면에 집계 실패 안내가 따라 올라오지 않도록 활성 구간에서만 노출한다 (S1·S7)
    isError: enabled && isError,
    retry,
  };
};
