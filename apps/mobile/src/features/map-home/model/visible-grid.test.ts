import { describe, expect, it } from "vitest";
import {
  GRID_ORIGIN,
  cellBoundsAt,
  cellIndexAt,
  type Bounds,
} from "../../../entities/cell/model/grid";
import { GRID_MIN_ZOOM, buildVisibleCells } from "./visible-grid";

/**
 * AC 3: 뷰포트 Bounds → 보이는 격자 셀(경계 좌표) 목록.
 * 원점·스텝 정렬 + 뷰포트 밖 셀 미포함을 단정한다.
 */

/** 서면 일대 뷰포트 — 위도 ~2.2셀 × 경도 ~2.3셀 규모 (격자 경계와 어긋난 임의 값) */
const viewport: Bounds = {
  sw: { lat: 35.1575, lng: 129.0585 },
  ne: { lat: 35.1595, lng: 129.061 },
};

const ZOOM = 16;

describe("buildVisibleCells (AC 3)", () => {
  it("뷰포트 안에 보이는 격자 셀 목록이 산출된다 — 뷰포트 네 모서리가 모두 어떤 셀에 덮인다", () => {
    const cells = buildVisibleCells(viewport, ZOOM);
    expect(cells.length).toBeGreaterThan(0);

    const corners = [
      viewport.sw,
      viewport.ne,
      { lat: viewport.sw.lat, lng: viewport.ne.lng },
      { lat: viewport.ne.lat, lng: viewport.sw.lng },
    ];
    for (const corner of corners) {
      const covering = cells.find(
        ({ bounds }) =>
          bounds.sw.lat <= corner.lat &&
          corner.lat <= bounds.ne.lat &&
          bounds.sw.lng <= corner.lng &&
          corner.lng <= bounds.ne.lng,
      );
      expect(covering).toBeDefined();
    }
  });

  it("모든 셀 경계가 원점·스텝에 정렬된다 — 셀 중심의 cellIndexAt→cellBoundsAt 왕복과 일치", () => {
    const cells = buildVisibleCells(viewport, ZOOM);
    for (const { bounds } of cells) {
      const center = {
        lat: (bounds.sw.lat + bounds.ne.lat) / 2,
        lng: (bounds.sw.lng + bounds.ne.lng) / 2,
      };
      const snapped = cellBoundsAt(cellIndexAt(center));
      expect(bounds.sw.lat).toBeCloseTo(snapped.sw.lat, 12);
      expect(bounds.sw.lng).toBeCloseTo(snapped.sw.lng, 12);
      expect(bounds.ne.lat).toBeCloseTo(snapped.ne.lat, 12);
      expect(bounds.ne.lng).toBeCloseTo(snapped.ne.lng, 12);
    }
  });

  it("뷰포트 밖 셀은 포함되지 않는다 — 모든 셀이 뷰포트와 실제로 겹친다", () => {
    const cells = buildVisibleCells(viewport, ZOOM);
    for (const { bounds } of cells) {
      expect(bounds.sw.lat).toBeLessThan(viewport.ne.lat);
      expect(bounds.ne.lat).toBeGreaterThan(viewport.sw.lat);
      expect(bounds.sw.lng).toBeLessThan(viewport.ne.lng);
      expect(bounds.ne.lng).toBeGreaterThan(viewport.sw.lng);
    }
  });

  it("셀 id는 원점 기준 col:row로 유일하다", () => {
    const cells = buildVisibleCells(viewport, ZOOM);
    const ids = cells.map((cell) => cell.id);
    expect(new Set(ids).size).toBe(ids.length);

    const originCell = cellIndexAt(viewport.sw);
    expect(ids).toContain(`${originCell.col}:${originCell.row}`);
  });

  it("줌이 GRID_MIN_ZOOM 미만이면 빈 배열이다 — 광역 줌 아웃 시 셀 폭증 방지 (웹 GRID_MIN_ZOOM 선례)", () => {
    expect(buildVisibleCells(viewport, GRID_MIN_ZOOM - 1)).toEqual([]);
    expect(buildVisibleCells(viewport, GRID_MIN_ZOOM).length).toBeGreaterThan(
      0,
    );
  });

  it("원점에서 먼 뷰포트에서도 정렬이 유지된다 — 원점 남서쪽(음수 인덱스) 뷰포트", () => {
    const southWest: Bounds = {
      sw: { lat: GRID_ORIGIN.lat - 0.003, lng: GRID_ORIGIN.lng - 0.004 },
      ne: { lat: GRID_ORIGIN.lat - 0.001, lng: GRID_ORIGIN.lng - 0.001 },
    };
    const cells = buildVisibleCells(southWest, ZOOM);
    expect(cells.length).toBeGreaterThan(0);
    for (const { bounds } of cells) {
      expect(bounds.sw.lat).toBeLessThan(southWest.ne.lat);
      expect(bounds.ne.lat).toBeGreaterThan(southWest.sw.lat);
      expect(bounds.sw.lng).toBeLessThan(southWest.ne.lng);
      expect(bounds.ne.lng).toBeGreaterThan(southWest.sw.lng);
    }
  });
});
