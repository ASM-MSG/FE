import { describe, expect, it } from "vitest";
import FIXTURE from "@/test/fixtures/grid-epsg5179-samples.json";
import {
  CELL_SIZE_METERS,
  CRS_DEF_EPSG5179,
  cellCornersAt,
  cellIndexAt,
  decodeGridCenter,
  decodeGridCorners,
  encodeGridId,
  viewportGridRange,
} from "./grid";

/**
 * 서버 정본 격자 규칙 EPSG:5179 전환 (MSG-357 — BE PR #134·#135, MSG-347).
 * 픽스처는 BE `src/test/resources/fixtures/grid-epsg5179-samples.json` 사본(정본은 BE, A4) —
 * PROJ 9.3.0 생성·서버(Proj4J) 전수 일치 확인본. 전국 20×10 격자점 200건.
 */

/** 꼭짓점 대조 허용 오차 1e-7°(약 1cm) — 픽스처(PROJ 9.3.0, 소수 9자리) 대 proj4js (A2) */
const CORNER_TOLERANCE_DEG = 1e-7;

const SAMPLES = FIXTURE.samples;

describe("CRS 정의 — 백엔드 정본과 글자 단위 동일 (기준 1)", () => {
  it("FE의 proj4 정의 문자열 상수가 픽스처 crsDefinition(=BE CRS_DEF_EPSG5179)과 문자열 동등이다", () => {
    expect(CRS_DEF_EPSG5179).toBe(FIXTURE.crsDefinition);
  });

  it("셀 크기는 100m다 — floor(x/100)·floor(y/100)", () => {
    expect(CELL_SIZE_METERS).toBe(FIXTURE.cellSizeMeters);
  });
});

describe("픽스처 200건 전수 — gridX·gridY·gridId 완전 일치 (기준 2)", () => {
  it("각 샘플 lat/lon의 셀 인덱스가 기대 gridX·gridY와 정수 단위로 완전 일치한다", () => {
    expect(SAMPLES).toHaveLength(200);
    for (const sample of SAMPLES) {
      const index = cellIndexAt({ lat: sample.lat, lng: sample.lon });
      expect(index, `(${sample.lat}, ${sample.lon})`).toEqual({
        gridX: sample.gridX,
        gridY: sample.gridY,
      });
    }
  });

  it("encodeGridId가 기대 gridId(`{gridY}_{gridX}`)와 완전 일치한다 — BE GridEncoder.encode 정본 순서", () => {
    for (const sample of SAMPLES) {
      expect(encodeGridId({ lat: sample.lat, lng: sample.lon })).toBe(
        sample.gridId,
      );
    }
  });
});

describe("픽스처 200건 전수 — 셀 꼭짓점 4점 대조 (기준 3)", () => {
  it("cellCornersAt이 남서→남동→북동→북서 4점을 cellCorners와 1e-7° 내로 일치시킨다", () => {
    for (const sample of SAMPLES) {
      const corners = cellCornersAt({
        gridX: sample.gridX,
        gridY: sample.gridY,
      });
      expect(corners).toHaveLength(4);
      sample.cellCorners.forEach((expected, i) => {
        expect(
          Math.abs(corners[i].lat - expected.lat),
          `${sample.gridId} corner ${i} lat`,
        ).toBeLessThanOrEqual(CORNER_TOLERANCE_DEG);
        expect(
          Math.abs(corners[i].lng - expected.lon),
          `${sample.gridId} corner ${i} lng`,
        ).toBeLessThanOrEqual(CORNER_TOLERANCE_DEG);
      });
    }
  });

  it("decodeGridCorners(gridId)는 cellCornersAt(인덱스)과 같은 셀을 가리킨다 — 격자 정의 단일화", () => {
    for (const sample of SAMPLES.filter((_, i) => i % 20 === 0)) {
      expect(decodeGridCorners(sample.gridId)).toEqual(
        cellCornersAt({ gridX: sample.gridX, gridY: sample.gridY }),
      );
    }
  });
});

describe("셀 중심 — BE GridEncoder.center 대응", () => {
  it("decodeGridCenter의 중심을 다시 encode하면 원래 gridId다 — 소비처(핫존·경계 판정) 왕복 정합", () => {
    for (const sample of SAMPLES.filter((_, i) => i % 10 === 0)) {
      expect(encodeGridId(decodeGridCenter(sample.gridId))).toBe(sample.gridId);
    }
  });

  it("중심은 셀 꼭짓점 4점의 내부에 있다 — 위경도 min/max 박스 기준", () => {
    const sample = SAMPLES[0];
    const corners = decodeGridCorners(sample.gridId);
    const center = decodeGridCenter(sample.gridId);
    const lats = corners.map((c) => c.lat);
    const lngs = corners.map((c) => c.lng);
    expect(center.lat).toBeGreaterThan(Math.min(...lats));
    expect(center.lat).toBeLessThan(Math.max(...lats));
    expect(center.lng).toBeGreaterThan(Math.min(...lngs));
    expect(center.lng).toBeLessThan(Math.max(...lngs));
  });
});

describe("뷰포트 → 셀 범위 — 꼭짓점 4점 min/max (기준 4, BE viewportRange 대응)", () => {
  /**
   * 픽스처 좌표로 만든 서쪽 원해(遠海) 뷰포트 — 중앙자오선(127.5°)에서 멀어 자오선 수렴이
   * 커서, 남서·북동 2점 변환만으로는 남동·북서 모서리의 셀이 범위 밖이 되는 가장자리 케이스다.
   */
  const SW = { lat: SAMPLES[0].lat, lng: SAMPLES[0].lon }; // (33.111, 124.488)
  const NE = { lat: 34.011, lng: 125.288 }; // 픽스처 격자점 (i=3, j=1)
  const VIEWPORT = { sw: SW, ne: NE };

  /** 뷰포트 경계 위 샘플 점 — 꼭짓점 4점 + 각 변의 1/4·1/2·3/4 지점 */
  const edgeSamples = () => {
    const points = [
      SW,
      NE,
      { lat: SW.lat, lng: NE.lng },
      { lat: NE.lat, lng: SW.lng },
    ];
    for (const t of [0.25, 0.5, 0.75]) {
      const lat = SW.lat + (NE.lat - SW.lat) * t;
      const lng = SW.lng + (NE.lng - SW.lng) * t;
      points.push(
        { lat: SW.lat, lng }, // 남변
        { lat: NE.lat, lng }, // 북변
        { lat, lng: SW.lng }, // 서변
        { lat, lng: NE.lng }, // 동변
      );
    }
    return points;
  };

  it("뷰포트 경계 위 모든 샘플 점의 셀 인덱스가 범위에 포함된다", () => {
    const range = viewportGridRange(VIEWPORT);
    for (const point of edgeSamples()) {
      const { gridX, gridY } = cellIndexAt(point);
      expect(
        gridX,
        `(${point.lat}, ${point.lng}) gridX`,
      ).toBeGreaterThanOrEqual(range.minGridX);
      expect(gridX, `(${point.lat}, ${point.lng}) gridX`).toBeLessThanOrEqual(
        range.maxGridX,
      );
      expect(
        gridY,
        `(${point.lat}, ${point.lng}) gridY`,
      ).toBeGreaterThanOrEqual(range.minGridY);
      expect(gridY, `(${point.lat}, ${point.lng}) gridY`).toBeLessThanOrEqual(
        range.maxGridY,
      );
    }
  });

  it("남서·북동 2점 변환만으로는 범위 밖이 되는 모서리가 실재한다 — 4점 min/max가 필요한 이유", () => {
    const swIndex = cellIndexAt(SW);
    const neIndex = cellIndexAt(NE);
    const naive = {
      minGridY: Math.min(swIndex.gridY, neIndex.gridY),
      maxGridY: Math.max(swIndex.gridY, neIndex.gridY),
    };

    // 남동 모서리: 자오선에 더 가까워 y가 남서점보다 작다 → 2점 범위 아래로 벗어난다
    const se = cellIndexAt({ lat: SW.lat, lng: NE.lng });
    expect(se.gridY).toBeLessThan(naive.minGridY);
    // 북서 모서리: 자오선에서 더 멀어 y가 북동점보다 크다 → 2점 범위 위로 벗어난다
    const nw = cellIndexAt({ lat: NE.lat, lng: SW.lng });
    expect(nw.gridY).toBeGreaterThan(naive.maxGridY);

    // 4점 범위는 두 모서리를 모두 포함한다
    const range = viewportGridRange(VIEWPORT);
    expect(range.minGridY).toBeLessThanOrEqual(se.gridY);
    expect(range.maxGridY).toBeGreaterThanOrEqual(nw.gridY);
  });
});
