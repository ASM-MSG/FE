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
import {
  clusterSourceForTheme,
  hotZoneAggregationQueryArgs,
  hotZoneAggregationQueryOptions,
  missionAggregationQueryArgs,
  missionAggregationQueryOptions,
  selectThemeClusters,
} from "./theme-aggregation-query";

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
 *
 * MSG-558 확장부터 **칩 택일 저줌 집계 훅**이다 — 칩 없음은 점령 집계, 핫은 핫구역 집계,
 * 축제·팝업은 미션 집계, 경로는 없음(`clusterSourceForTheme`, 웹 MapShell 택일 이식).
 * 이름은 그대로 둔다 — 리네임은 화면 import 헝크(557 인접)를 건드린다(리스크 R10, 후속).
 * 실패·재시도는 **활성 소스 하나**만 본다 — 칩 화면에 점령 집계의 옛 실패가 올라오지 않는다.
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
  const theme = useSelectedTheme();
  const themeActive = theme !== null;
  // 지도 준비 전(뷰포트 null)에는 격자 줌을 넣어 단위 미판정(null) 상태로 둔다 —
  // 어차피 bounds가 null이라 발사되지 않지만, 단위가 임의로 정해지지 않게 한다
  const zoom = viewport?.zoom ?? GRID_MIN_ZOOM;
  const bounds = viewport?.bounds ?? null;
  const gate = { bounds, zoom, isAuthenticated, hydrated, themeActive };
  const themeGate = { theme, bounds, zoom };
  const { unit, enabled } = gridAggregationQueryArgs(gate);
  const mission = missionAggregationQueryArgs(themeGate);
  const hot = hotZoneAggregationQueryArgs(themeGate);

  const query = useQuery(gridAggregationQueryOptions(gate));
  const missionQuery = useQuery(missionAggregationQueryOptions(themeGate));
  const hotQuery = useQuery(hotZoneAggregationQueryOptions(themeGate));
  const items = selectAggregationItems(enabled, query.data);
  const { data: missionData } = missionQuery;
  const { data: hotData } = hotQuery;
  const clusters = useMemo(
    () =>
      themeActive
        ? selectThemeClusters({ theme, unit, zoom, missionData, hotData })
        : toClusterMarkers(items, unit, zoom),
    [themeActive, theme, unit, zoom, missionData, hotData, items],
  );

  // 활성 소스 하나의 상태만 본다 — 경로 칩(none)은 집계 층이 없어 실패도 없다
  const active = {
    occupied: { query, enabled },
    mission: { query: missionQuery, enabled: mission.enabled },
    hot: { query: hotQuery, enabled: hot.enabled },
    none: { query, enabled: false },
  }[clusterSourceForTheme(theme)];
  const { isError, retry } = gatedQueryStatus(active.query, active.enabled);

  return {
    clusters,
    // 게이트가 닫힌 뒤에도 마지막 실패는 쿼리에 남는다 — 격자 줌으로 복귀했거나 칩을
    // 바꾼 화면에 집계 실패 안내가 따라 올라오지 않도록 활성 구간에서만 노출한다 (S1·S7)
    isError: active.enabled && isError,
    retry,
  };
};
