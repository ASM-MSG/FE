import { useQuery } from "@tanstack/react-query";
import type { LatLng } from "@/entities/cell";
import { mapQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { reverseGeocodeOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { RegionResponseDto } from "@/shared/api/generated/types.gen";
import { useDebouncedValue } from "@/shared/use-debounced-value";

/**
 * 지도 이동 멈춤 판정 지연 (스펙 추정 9) — 드래그 중 매 프레임 reverse-geocode를
 * 쏘지 않도록 중심 좌표 변경을 이 시간만큼 눌러서 반영한다.
 */
export const REVERSE_GEOCODE_DEBOUNCE_MS = 500;

/** reverse-geocode 결과 — data null(행정동 밖)과 미도착(undefined)을 구분한다 (AC 12) */
export interface ReverseGeocodeResult {
  /** 중심 좌표를 포함하는 행정동 — 행정동 밖(바다 등)이거나 미도착이면 null */
  region: RegionResponseDto | null;
  /** 응답 확정 여부 — false면 아직 조회 전/중이라 region null이 "행정동 없음"이 아니다 */
  isResolved: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * 지도 중심 좌표의 행정동 판별 쿼리 (MSG-328 AC 4·12) — `GET /api/regions/reverse-geocode`.
 * center 변경은 디바운스로 눌러 이동이 멈춘 뒤에만 조회한다. center가 null이면(뷰포트
 * 미준비) 조회하지 않는다 — 익명 조회는 서버가 허용해(MSG-467, 실측 2026-08-26) 호출부의
 * 비로그인 게이트는 MSG-474에서 제거됐다. 지도 SDK를 import하지 않는다(RN 경계).
 * mapQueryPolicy(keepPreviousData) — 이동 중에도 직전 행정동 라벨이 유지돼 헤더가 깜빡이지 않는다.
 */
export const useReverseGeocodeQuery = (
  center: LatLng | null,
): ReverseGeocodeResult => {
  const { debounced } = useDebouncedValue(center, REVERSE_GEOCODE_DEBOUNCE_MS);
  const enabled = debounced !== null;

  const query = useQuery({
    ...reverseGeocodeOptions({
      query: { lat: debounced?.lat ?? 0, lng: debounced?.lng ?? 0 },
    }),
    select: unwrapEnvelope,
    enabled,
    ...mapQueryPolicy,
  });

  return {
    region: query.data ?? null,
    isResolved: enabled && query.data !== undefined,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
};
