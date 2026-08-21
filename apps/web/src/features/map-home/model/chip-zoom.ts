import { MAP_SCALE_1KM_ZOOM, MAP_SCALE_500M_ZOOM } from "./map-scale";
import type { ThemeId } from "./theme";

/**
 * 칩 활성화 시 맞추는 줌 단 (MSG-403 AC 5).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 칩마다 대상의 지리적 크기가 다르다: 축제·팝업은 한 장소라 500m면 영역이 다 들어오고,
 * 코스는 동 하나보다 넓어 1km라야 라인 전체가 화면에 남는다(MSG-395는 코스도 500m였다).
 * 핫구역은 현재 보고 있는 동의 격자라 줌을 건드리지 않는다.
 */
export const chipEntryZoom = (theme: ThemeId): number | null => {
  switch (theme) {
    case "festival":
    case "popup":
      return MAP_SCALE_500M_ZOOM;
    case "route":
      return MAP_SCALE_1KM_ZOOM;
    case "hot":
      return null;
  }
};
