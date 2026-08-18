import type { ZoneResponseDto } from "@/shared/api/generated";

/**
 * 서면(부산 부산진구) 구역 사각형 픽스처 — 세로 4칸(A~D행)·가로 6칸(1~6열).
 * 격자 검색 스모크·zones 쿼리 테스트가 공유한다 (MSG-412).
 */
export const SEOMYEON_ZONE: ZoneResponseDto = {
  zoneKey: "seomyeon",
  name: "서면",
  regionCode: null,
  minGridY: 16850,
  maxGridY: 16853,
  minGridX: 11419,
  maxGridX: 11424,
  priority: 1,
};
