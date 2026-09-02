import { describe, expect, it } from "vitest";
import { hotCellsVisible, missionCellsVisible } from "./occupancy-visibility";
import { GRID_MIN_ZOOM } from "./visible-grid";

/**
 * L10 (MSG-558 확장): 칩 활성 저줌의 테마 격자 낱개 게이트가 웹 원본 `occupancy-visibility.ts`
 * (`missionCellsVisible`·`hotCellsVisible`)와 zoom 6~21 × hasDetailTarget 전건 동일하다.
 * `visibleOccupiedCells`는 포팅 대상이 아니다 — 앱은 점령 배타를 훅 게이트로 구현한다.
 *
 * 웹 원본은 변수 경로 동적 import (map-query-policy.parity.test.ts 선례).
 */
const WEB_OCCUPANCY_VISIBILITY_PATH = new URL(
  "../../../../../web/src/features/map-home/model/occupancy-visibility.ts",
  import.meta.url,
).pathname;

interface WebOccupancyVisibility {
  missionCellsVisible: typeof missionCellsVisible;
  hotCellsVisible: typeof hotCellsVisible;
}

const loadWeb = (): Promise<WebOccupancyVisibility> =>
  import(WEB_OCCUPANCY_VISIBILITY_PATH);

describe("occupancy-visibility 동등성 (L10)", () => {
  it("missionCellsVisible은 zoom 6~21 × hasDetailTarget 양쪽에서 웹과 전건 동일하다", async () => {
    const web = await loadWeb();

    for (let zoom = 6; zoom <= 21; zoom++) {
      for (const hasDetailTarget of [false, true]) {
        expect(missionCellsVisible({ zoom, hasDetailTarget })).toBe(
          web.missionCellsVisible({ zoom, hasDetailTarget }),
        );
      }
    }
  });

  it("hotCellsVisible은 zoom 6~21 전건에서 웹과 동일하다", async () => {
    const web = await loadWeb();

    for (let zoom = 6; zoom <= 21; zoom++) {
      expect(hotCellsVisible({ zoom })).toBe(web.hotCellsVisible({ zoom }));
    }
  });

  it("축제·팝업 격자는 GRID_MIN_ZOOM 미만에서 걷히되 상세를 연 대상이 있으면 남는다 (C4)", () => {
    expect(
      missionCellsVisible({ zoom: GRID_MIN_ZOOM - 1, hasDetailTarget: false }),
    ).toBe(false);
    expect(
      missionCellsVisible({ zoom: GRID_MIN_ZOOM - 1, hasDetailTarget: true }),
    ).toBe(true);
    expect(
      missionCellsVisible({ zoom: GRID_MIN_ZOOM, hasDetailTarget: false }),
    ).toBe(true);
  });

  it("핫 격자는 GRID_MIN_ZOOM 미만에서 예외 없이 걷힌다 (C4)", () => {
    expect(hotCellsVisible({ zoom: GRID_MIN_ZOOM - 1 })).toBe(false);
    expect(hotCellsVisible({ zoom: GRID_MIN_ZOOM })).toBe(true);
  });
});
