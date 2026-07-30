import { describe, expect, it } from "vitest";
import { METERS_PER_DEGREE_LAT } from "./cell-geometry";
import {
  GRID_CELL_METERS,
  GRID_LAT_STEP,
  GRID_LNG_STEP,
  GRID_ORIGIN,
  GRID_REF_LAT,
  cellBoundsAt,
  cellIndexAt,
} from "./grid";

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** 부산 내 표본 좌표 — 서면·영도·해운대·가덕도 (MVP 부산, 서울 지명 금지) */
const BUSAN_SAMPLES = [
  { name: "서면", lat: 35.1579, lng: 129.0594 },
  { name: "영도", lat: 35.075, lng: 129.067 },
  { name: "해운대", lat: 35.1631, lng: 129.1604 },
  { name: "가덕도", lat: 35.025, lng: 128.83 },
];

describe("100m 균일 격자 (MSG-263 AC 1)", () => {
  it("부산 내 임의 좌표 → 셀 인덱스 → 셀 bounds 변환이 왕복 정합한다 — 좌표는 소속 셀 bounds 안이고, bounds 중심의 인덱스는 동일하다", () => {
    for (const { lat, lng } of BUSAN_SAMPLES) {
      const index = cellIndexAt({ lat, lng });
      const bounds = cellBoundsAt(index);

      // 좌표가 소속 셀 bounds 안에 있다 (floor 스냅 — sw 포함, ne 미만)
      expect(lat).toBeGreaterThanOrEqual(bounds.sw.lat);
      expect(lat).toBeLessThan(bounds.ne.lat);
      expect(lng).toBeGreaterThanOrEqual(bounds.sw.lng);
      expect(lng).toBeLessThan(bounds.ne.lng);

      // bounds 중심으로 역변환하면 같은 인덱스다
      const center = {
        lat: (bounds.sw.lat + bounds.ne.lat) / 2,
        lng: (bounds.sw.lng + bounds.ne.lng) / 2,
      };
      expect(cellIndexAt(center)).toEqual(index);
    }
  });

  it("셀 한 변 실거리가 기준 위도에서 100m(±1%)이다 — 남북(자오선)·동서(기준 위도 cos 보정) 모두", () => {
    const bounds = cellBoundsAt(cellIndexAt(BUSAN_SAMPLES[0]));

    const latSideMeters =
      (bounds.ne.lat - bounds.sw.lat) * METERS_PER_DEGREE_LAT;
    const lngSideMeters =
      (bounds.ne.lng - bounds.sw.lng) *
      METERS_PER_DEGREE_LAT *
      Math.cos(toRadians(GRID_REF_LAT));

    expect(latSideMeters).toBeGreaterThan(GRID_CELL_METERS * 0.99);
    expect(latSideMeters).toBeLessThan(GRID_CELL_METERS * 1.01);
    expect(lngSideMeters).toBeGreaterThan(GRID_CELL_METERS * 0.99);
    expect(lngSideMeters).toBeLessThan(GRID_CELL_METERS * 1.01);
  });

  it("경도 스텝 고정 근사(D1)의 오차가 부산 위도 범위 극단(남 34.985·북 35.386)에서도 ±1% 미만이다", () => {
    for (const lat of [34.985, 35.386]) {
      const actualSideMeters =
        GRID_LNG_STEP * METERS_PER_DEGREE_LAT * Math.cos(toRadians(lat));
      expect(actualSideMeters).toBeGreaterThan(GRID_CELL_METERS * 0.99);
      expect(actualSideMeters).toBeLessThan(GRID_CELL_METERS * 1.01);
    }
  });

  it("격자 원점(부산 bbox SW, D2)이 (0,0) 셀의 SW 꼭짓점이다", () => {
    expect(cellIndexAt(GRID_ORIGIN)).toEqual({ col: 0, row: 0 });

    const originCell = cellBoundsAt({ col: 0, row: 0 });
    expect(originCell.sw.lat).toBeCloseTo(GRID_ORIGIN.lat, 10);
    expect(originCell.sw.lng).toBeCloseTo(GRID_ORIGIN.lng, 10);
    expect(originCell.ne.lat).toBeCloseTo(GRID_ORIGIN.lat + GRID_LAT_STEP, 10);
    expect(originCell.ne.lng).toBeCloseTo(GRID_ORIGIN.lng + GRID_LNG_STEP, 10);
  });
});
