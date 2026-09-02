import { GRID_MIN_ZOOM } from "./visible-grid";

/**
 * 칩 활성 저줌의 테마 격자 낱개 게이트 (MSG-558 확장 C4) — 웹
 * `features/map-home/model/occupancy-visibility.ts`의 `missionCellsVisible`·`hotCellsVisible`
 * 포팅본. `visibleOccupiedCells`는 옮기지 않는다 — 앱은 점령 배타를 집계 훅 게이트
 * (`grid-aggregation-query.ts`의 `!themeActive`)로 이미 구현한다.
 * 동등성은 occupancy-visibility.parity.test.ts가 웹 원본을 직접 import해 단정한다.
 * 순수 함수 — 지도 SDK/RN 무의존.
 *
 * 줌아웃하면 격자 낱개 대신 행정 단위 집계 말풍선이 그 자리를 대신한다 — 임계는 개별
 * 격자 층과 같은 `GRID_MIN_ZOOM`이라 칩을 켜고 끌 때 표시 방식이 튀지 않는다.
 * 이 게이트가 없으면 zoom 14~15에서 100m 테마 셀과 말풍선이 공존한다.
 */

/**
 * 축제·팝업 칩의 미션 격자를 그릴지. **상세를 연 대상은 예외** — 칩 진입이 최근접
 * 대상으로 지도를 옮기는데 그 줌이 저줌이면 도착지가 텅 빈 채로 남는다.
 */
export const missionCellsVisible = ({
  zoom,
  hasDetailTarget,
}: {
  zoom: number;
  /** 상세를 연 미션·코스가 있는지 — 있으면 그 하나만 자기 경계로 그린다 */
  hasDetailTarget: boolean;
}): boolean => hasDetailTarget || zoom >= GRID_MIN_ZOOM;

/** 핫구역 칩의 핫 격자를 그릴지 — 핫구역엔 상세를 여는 대상이 없어 예외가 없다 */
export const hotCellsVisible = ({ zoom }: { zoom: number }): boolean =>
  zoom >= GRID_MIN_ZOOM;
