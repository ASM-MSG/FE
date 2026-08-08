import { describe, expect, it } from "vitest";
import { METERS_PER_DEGREE_LAT } from "./cell-geometry";
import {
  GRID_LAT_STEP,
  GRID_LNG_STEP,
  GRID_ORIGIN,
  cellBoundsAt,
  cellIndexAt,
  decodeGridBounds,
  encodeGridId,
} from "./grid";

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/** 부산 내 표본 좌표 — 서면·영도·해운대·가덕도 (MVP 부산, 서울 지명 금지) */
const BUSAN_SAMPLES = [
  { name: "서면", lat: 35.1579, lng: 129.0594 },
  { name: "영도", lat: 35.075, lng: 129.067 },
  { name: "해운대", lat: 35.1631, lng: 129.1604 },
  { name: "가덕도", lat: 35.025, lng: 128.83 },
];

/** 명세 예시 gridId (OpenAPI `OccupiedGridResponseDto.gridId` example) — 서버 인코딩의 정본 표본 */
const SPEC_EXAMPLE_GRID_ID = "41642_110458";

describe("서버 정본 격자 규칙 (MSG-325 — GridConstants·GridEncoder)", () => {
  it("스텝·원점이 서버 공유 상수다 — lat 0.0009 · lng 0.00115, 원점은 적도·본초자오선", () => {
    expect(GRID_LAT_STEP).toBe(0.0009);
    expect(GRID_LNG_STEP).toBe(0.00115);
    expect(GRID_ORIGIN).toEqual({ lat: 0, lng: 0 });
  });

  it("encodeGridId가 서버 GridEncoder와 같은 식이다 — `${floor(lat/latStep)}_${floor(lng/lngStep)}`", () => {
    for (const { lat, lng } of BUSAN_SAMPLES) {
      const expected = `${Math.floor(lat / GRID_LAT_STEP)}_${Math.floor(lng / GRID_LNG_STEP)}`;
      expect(encodeGridId({ lat, lng })).toBe(expected);
    }
  });

  it("명세 예시 gridId를 디코드하면 bbox가 남 gridY·서 gridX 스텝 배수이고, 그 중심을 다시 encode하면 원래 gridId다", () => {
    const bounds = decodeGridBounds(SPEC_EXAMPLE_GRID_ID);

    expect(bounds.sw.lat).toBeCloseTo(41642 * GRID_LAT_STEP, 10);
    expect(bounds.sw.lng).toBeCloseTo(110458 * GRID_LNG_STEP, 10);
    expect(bounds.ne.lat).toBeCloseTo(41643 * GRID_LAT_STEP, 10);
    expect(bounds.ne.lng).toBeCloseTo(110459 * GRID_LNG_STEP, 10);

    const center = {
      lat: (bounds.sw.lat + bounds.ne.lat) / 2,
      lng: (bounds.sw.lng + bounds.ne.lng) / 2,
    };
    expect(encodeGridId(center)).toBe(SPEC_EXAMPLE_GRID_ID);
  });

  it("FE 격자 정의가 하나뿐이다 — cellIndexAt∘cellBoundsAt이 encodeGridId∘decodeGridBounds와 같은 셀을 가리킨다", () => {
    for (const { lat, lng } of BUSAN_SAMPLES) {
      const point = { lat, lng };
      expect(cellBoundsAt(cellIndexAt(point))).toEqual(
        decodeGridBounds(encodeGridId(point)),
      );
    }
  });

  it("부산 내 임의 좌표 → 셀 인덱스 → 셀 bounds 변환이 왕복 정합한다 — 좌표는 소속 셀 bounds 안이고, bounds 중심의 인덱스는 동일하다", () => {
    for (const { lat, lng } of BUSAN_SAMPLES) {
      const index = cellIndexAt({ lat, lng });
      const bounds = cellBoundsAt(index);

      // 좌표가 소속 셀 bounds 안에 있다 (floor 반열림 — sw 포함, ne 미만)
      expect(lat).toBeGreaterThanOrEqual(bounds.sw.lat);
      expect(lat).toBeLessThan(bounds.ne.lat);
      expect(lng).toBeGreaterThanOrEqual(bounds.sw.lng);
      expect(lng).toBeLessThan(bounds.ne.lng);

      const center = {
        lat: (bounds.sw.lat + bounds.ne.lat) / 2,
        lng: (bounds.sw.lng + bounds.ne.lng) / 2,
      };
      expect(cellIndexAt(center)).toEqual(index);
    }
  });

  it("셀은 정사각형이 아니다 — 부산에서 남북 ≈100.2m · 동서 ≈104.7m (위경도 등간격 근사, 글로서리 명시)", () => {
    const busanLat = 35.16;
    const latSideMeters = GRID_LAT_STEP * METERS_PER_DEGREE_LAT;
    const lngSideMeters =
      GRID_LNG_STEP * METERS_PER_DEGREE_LAT * Math.cos(toRadians(busanLat));

    expect(latSideMeters).toBeCloseTo(100.2, 1);
    expect(lngSideMeters).toBeCloseTo(104.7, 1);
  });

  it("동서 폭은 위도가 낮아질수록 넓어진다 — 한국 위도대(33~38°)에서 100~110m 범위에 든다", () => {
    for (const lat of [33, 35.16, 38]) {
      const sideMeters =
        GRID_LNG_STEP * METERS_PER_DEGREE_LAT * Math.cos(toRadians(lat));
      expect(sideMeters).toBeGreaterThan(100);
      expect(sideMeters).toBeLessThan(110);
    }
  });
});
