import { useQuery } from "@tanstack/react-query";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { reverseGeocodeOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type { RegionResponseDto } from "@/shared/api/generated";

/**
 * 업로드 위치 라벨 파생 (MSG-329 B2) — mock "A-14" 상수 폐기.
 * 좌표는 지도 뷰포트 중심(결정 A 확정), 라벨은 `GET /api/regions/reverse-geocode`의
 * regionName(행정동). 무귀속 좌표(바다 등 — data null)는 일반 라벨로 폴백한다.
 * "서면 A-14" 셀 조합 표기는 확정 응답(zoneName·zoneCell)부터 가능하다 (스펙 추정 2 —
 * point→zone 라벨 API 부재는 백엔드 환류, Figma 오탐 방지 4).
 */

/** 라벨 파생 순수 함수 — 행정동 응답이 있으면 regionName, 없으면 "현재 위치" */
export const formatUploadLocationLabel = (
  region: RegionResponseDto | null | undefined,
): string => region?.regionName ?? "현재 위치";

/**
 * 뷰포트 중심 좌표 + 행정동 라벨 — POST /api/videos body의 lat/lng도 같은 좌표다 (B9).
 * enabled=false면 조회하지 않는다 — UploadModal은 AppLayout에 상시 마운트라 열림 시에만 조회.
 */
export const useUploadLocation = (enabled: boolean = true) => {
  const center = useViewportStore((s) => s.center);
  const query = useQuery({
    ...reverseGeocodeOptions({ query: { lat: center.lat, lng: center.lng } }),
    select: unwrapEnvelope,
    enabled,
  });
  return {
    center,
    label: formatUploadLocationLabel(query.data),
    isLoading: query.isLoading,
  };
};
