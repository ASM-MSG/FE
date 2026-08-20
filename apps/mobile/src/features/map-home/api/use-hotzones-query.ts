import { useQuery } from "@tanstack/react-query";
import type { Bounds } from "../../../entities/cell/model/grid";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getHotZonesOptions } from "../../../shared/api/query-options";
import type { HotZoneResponseDto } from "../../../shared/api/sdk";
import { useAuth } from "../../auth/model/auth-session";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../model/home-sheet-state";
import { mapQueryPolicy } from "../model/map-query-policy";
import { viewportQueryArgs } from "../model/viewport-query";

/**
 * 뷰포트 내 핫구역 조회 (MSG-427 B1) — `GET /api/hotzones`.
 * 웹 `use-hotzones-query.ts`의 `useHotZones` 이식. 지도 SDK를 import하지 않는다.
 *
 * `score`·`regionName`을 버리지 않고 그대로 남긴다 — 동 요약이 `regionName`으로 이 동의
 * 격자만 걸러내고(B1) 스코어 상위 격자만 표본으로 삼기 때문이다(B5).
 * 조회 **상태까지** 돌려준다: 배열만 주면 요청이 실패해도 소비처가 "핫구역이 없는 동"과
 * 구분하지 못해 오류 대신 빈 상태를 띄운다.
 * 보호 API(익명 401 실측)라 비로그인은 조회하지 않는다.
 */
export interface HotZonesResult extends GatedQueryStatus {
  zones: HotZoneResponseDto[];
}

const EMPTY_HOT_ZONES: HotZoneResponseDto[] = [];

export const useHotZonesQuery = (bounds: Bounds | null): HotZonesResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const { query, enabled } = viewportQueryArgs(bounds);
  const active = enabled && isAuthenticated;
  const settled = hydrated && bounds !== null;

  const queryResult = useQuery({
    ...getHotZonesOptions({ query }),
    select: unwrapEnvelope,
    enabled: active,
    ...mapQueryPolicy,
  });

  return {
    zones: queryResult.data?.hotZones ?? EMPTY_HOT_ZONES,
    ...gatedQueryStatus(queryResult, active, settled),
  };
};
