import { useQuery } from "@tanstack/react-query";
import type { LatLng } from "../../../entities/cell/model/grid";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { reverseGeocodeOptions } from "../../../shared/api/query-options";
import type { RegionResponseDto } from "../../../shared/api/sdk";
import { useDebouncedValue } from "../../../shared/use-debounced-value";
import { useAuth } from "../../auth/model/auth-session";
import {
  gatedQueryStatus,
  type GatedQueryStatus,
} from "../model/home-sheet-state";
import { mapQueryPolicy } from "../model/map-query-policy";

/**
 * 지도 중심 좌표의 행정동 판별 (MSG-423 요구 2·5) — `GET /api/regions/reverse-geocode`.
 * 웹 `features/region/model/use-reverse-geocode-query.ts` 이식.
 * 중심 변경은 디바운스로 눌러 이동이 멈춘 뒤에만 조회한다.
 * mapQueryPolicy(keepPreviousData) — 이동 중 직전 동 이름이 유지돼 헤더가 깜빡이지 않는다.
 * 보호 API(익명 401)라 비로그인이면 발사하지 않는다.
 */

/** 지도 이동 멈춤 판정 지연 — 드래그 중 매 프레임 조회를 막는다 (웹과 같은 값) */
export const REVERSE_GEOCODE_DEBOUNCE_MS = 500;

export interface ReverseGeocodeResult extends GatedQueryStatus {
  /** 중심 좌표를 포함하는 행정동 — 행정동 밖(바다 등)이거나 미도착이면 null */
  region: RegionResponseDto | null;
}

export const useReverseGeocodeQuery = (
  center: LatLng | null,
): ReverseGeocodeResult => {
  const { isAuthenticated, hydrated } = useAuth();
  const debounced = useDebouncedValue(center, REVERSE_GEOCODE_DEBOUNCE_MS);
  const active = debounced !== null && isAuthenticated;
  // 디바운스 훅은 마운트 초기값을 지연 없이 노출하므로, 중심이 null인 경우는
  // 지도 뷰포트 미확정뿐이다 — 재수화 전과 함께 "아직 모름"으로 둔다 (PR #72 리뷰)
  const settled = hydrated && debounced !== null;

  const query = useQuery({
    ...reverseGeocodeOptions({
      query: { lat: debounced?.lat ?? 0, lng: debounced?.lng ?? 0 },
    }),
    select: unwrapEnvelope,
    enabled: active,
    ...mapQueryPolicy,
  });

  return {
    region: query.data ?? null,
    ...gatedQueryStatus(query, active, settled),
  };
};
