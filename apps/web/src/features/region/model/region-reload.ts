/**
 * "장소 불러오기" 재검색 버튼 판정·라벨 (MSG-328 AC 8) — 순수 함수.
 * 지도 SDK/플랫폼(window·router)에 의존하지 않는다 — RN 재사용 대상.
 */

/**
 * 재검색 버튼 노출 판정 — 표시 중 행정동과 현재 지도 중심 행정동이 모두 있고 서로 다를 때만.
 * 표시 지역이 아직 없거나(최초 진입 자동 채택 전) 중심이 행정동 밖(null)이면 노출하지 않는다.
 */
export const shouldShowReload = (
  displayedRegionCode: string | null,
  currentRegionCode: string | null,
): boolean =>
  displayedRegionCode !== null &&
  currentRegionCode !== null &&
  displayedRegionCode !== currentRegionCode;

/** 버튼 라벨 — "{행정동} 장소 불러오기" (Figma 14357-18972 fab-load-places) */
export const reloadLabel = (regionName: string): string =>
  `${regionName} 장소 불러오기`;
