import { describe, expect, it } from "vitest";
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

  // MSG-325: 격자 원점이 서버 정본(적도·본초자오선)으로 바뀌어 "원점 = bbox SW" 단정은 폐기했다.
  // BUSAN_BBOX는 뷰포트 컬링(grid-overlay) 기준으로 남으므로, 그 역할의 불변식으로 대체한다.
  it("BUSAN_BBOX가 경계 데이터 전 정점을 감싼다 — 뷰포트 컬링이 경계 일부를 잘라내지 않는다", () => {
    for (const ring of BUSAN_BOUNDARY.flat()) {
      for (const point of ring) {
        expect(point.lat).toBeGreaterThanOrEqual(BUSAN_BBOX.sw.lat);
        expect(point.lat).toBeLessThanOrEqual(BUSAN_BBOX.ne.lat);
        expect(point.lng).toBeGreaterThanOrEqual(BUSAN_BBOX.sw.lng);
        expect(point.lng).toBeLessThanOrEqual(BUSAN_BBOX.ne.lng);
      }
    }
  });

  it("실데이터 절단(AC 3): 수영만(광안대교로 폐합된 내수면 홀)을 가로지르는 수평선이 다중 선분으로 갈라지고, 바다(홀) 구간은 결과에 없다", () => {
    // MSG-357: 절단 입력이 축평행 서술에서 임의 선분으로 일반화됐다 — 같은 수평선을 선분으로 표현
    const segments = clipLineToBoundary(
      [
        { lat: 35.145, lng: 129.1 },
        { lat: 35.145, lng: 129.16 },
      ],
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
