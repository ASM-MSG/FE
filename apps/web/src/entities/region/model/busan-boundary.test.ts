import { describe, expect, it } from "vitest";
import { GRID_ORIGIN } from "@/entities/cell";
import { clipLineToBoundary, pointInPolygon } from "./boundary-geometry";
import { BUSAN_BBOX, BUSAN_BOUNDARY } from "./busan-boundary";

describe("부산 행정경계 정적 데이터 (MSG-263 D7·D8, AC 4)", () => {
  it("간소화 예산을 지킨다 — 정점 총 300개 이하", () => {
    const total = BUSAN_BOUNDARY.flat().reduce(
      (sum, ring) => sum + ring.length,
      0,
    );
    expect(total).toBeLessThanOrEqual(300);
  });

  it("부산 내륙·주요 섬(영도·가덕도)은 내부 판정이 참이다 — 간소화에서 섬 유지", () => {
    const inside = [
      { name: "서면", lat: 35.1579, lng: 129.0594 },
      { name: "해운대", lat: 35.1631, lng: 129.1604 },
      { name: "영도", lat: 35.075, lng: 129.067 },
      { name: "가덕도", lat: 35.025, lng: 128.83 },
    ];
    for (const point of inside) {
      expect(pointInPolygon(point, BUSAN_BOUNDARY), point.name).toBe(true);
    }
  });

  it("경계 밖(남해 바다·서쪽 김해 방면·북동 울산 방면)은 내부 판정이 거짓이다", () => {
    const outside = [
      { name: "남해", lat: 34.95, lng: 129.0 },
      { name: "김해 방면", lat: 35.2, lng: 128.85 },
      { name: "울산 방면", lat: 35.4, lng: 129.35 },
    ];
    for (const point of outside) {
      expect(pointInPolygon(point, BUSAN_BOUNDARY), point.name).toBe(false);
    }
  });

  it("격자 원점(D2) = 부산 bbox SW 코너 — grid.ts 하드코딩 스냅샷과 데이터가 정합한다", () => {
    expect(GRID_ORIGIN).toEqual(BUSAN_BBOX.sw);
  });

  it("실데이터 절단(AC 3): 수영만(광안대교로 폐합된 내수면 홀)을 가로지르는 수평선이 다중 선분으로 갈라지고, 바다(홀) 구간은 결과에 없다", () => {
    const segments = clipLineToBoundary(
      { axis: "h", lat: 35.145, fromLng: 129.1, toLng: 129.16 },
      BUSAN_BOUNDARY,
    );

    expect(segments.length).toBeGreaterThanOrEqual(2);
    // 만 한복판(홀 내부)은 어느 선분에도 포함되지 않는다
    const bayLng = 129.125;
    for (const [a, b] of segments) {
      expect(bayLng < a.lng || bayLng > b.lng).toBe(true);
    }
  });
});
