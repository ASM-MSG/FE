import { MAP_SCALE_2KM_ZOOM } from "@/features/map-home/model/map-scale";

/**
 * "장소 불러오기" 재검색 버튼 판정·라벨 (MSG-328 AC 8) — 순수 함수.
 * 지도 SDK/플랫폼(window·router)에 의존하지 않는다 — RN 재사용 대상.
 */

/**
 * 불러오기가 동작하는 가장 넓은 줌 — 축척 `2km` 단 (MSG-403 후속, 사용자 요청).
 * 이보다 넓게 줌아웃한 화면은 한 번에 시·군 단위를 불러오게 되어 목록이 보고 있는 곳과
 * 무관해진다. 값은 축척 표에서 찾아 쓴다 — 표가 재보정되면 이 상한도 따라 움직인다.
 */
export const MIN_RELOAD_ZOOM = MAP_SCALE_2KM_ZOOM;

/**
 * 재검색 버튼 노출 판정 — 표시 중 행정동과 현재 지도 중심 행정동이 모두 있고 서로 다르며,
 * **축척 2km 단 이내로 확대돼 있을 때만**.
 * 표시 지역이 아직 없거나(최초 진입 자동 채택 전) 중심이 행정동 밖(null)이면 노출하지 않는다.
 */
export const shouldShowReload = (
  displayedRegionCode: string | null,
  currentRegionCode: string | null,
  zoom: number,
): boolean =>
  displayedRegionCode !== null &&
  currentRegionCode !== null &&
  displayedRegionCode !== currentRegionCode &&
  zoom >= MIN_RELOAD_ZOOM;

/** 버튼 라벨 — "{행정동} 장소 불러오기" (Figma 14357-18972 fab-load-places) */
export const reloadLabel = (regionName: string): string =>
  `${regionName} 장소 불러오기`;
