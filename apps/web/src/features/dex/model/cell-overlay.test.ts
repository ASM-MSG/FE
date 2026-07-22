import { describe, expect, it } from "vitest";
import { CELL_SIDE_METERS, METERS_PER_DEGREE_LAT, cellToBounds } from "./cell-overlay";

describe("cellToBounds — 격자 중심+한 변 → 사각 Bounds 변환 (AC 10)", () => {
  const SEOMYEON = { lat: 35.1579, lng: 129.0594 };

  it("반환된 bounds의 중점이 입력 중심과 일치한다", () => {
    const { sw, ne } = cellToBounds(SEOMYEON, 500);

    expect((sw.lat + ne.lat) / 2).toBeCloseTo(SEOMYEON.lat, 10);
    expect((sw.lng + ne.lng) / 2).toBeCloseTo(SEOMYEON.lng, 10);
  });

  it("위도 스팬은 한 변 길이(m)를 위도 1도당 미터로 나눈 값이다", () => {
    const { sw, ne } = cellToBounds(SEOMYEON, 500);

    expect(ne.lat - sw.lat).toBeCloseTo(500 / METERS_PER_DEGREE_LAT, 10);
  });

  it("적도(위도 0)에서는 경도 스팬과 위도 스팬이 같다", () => {
    const { sw, ne } = cellToBounds({ lat: 0, lng: 127 }, 500);

    expect(ne.lng - sw.lng).toBeCloseTo(ne.lat - sw.lat, 10);
  });

  it("경도 스팬은 위도별 보정된다 — 부산 위도에서는 위도 스팬을 cos(lat)로 나눈 값", () => {
    const { sw, ne } = cellToBounds(SEOMYEON, 500);
    const latSpan = ne.lat - sw.lat;
    const expectedLngSpan = latSpan / Math.cos((SEOMYEON.lat * Math.PI) / 180);

    expect(ne.lng - sw.lng).toBeCloseTo(expectedLngSpan, 10);
    // 고위도일수록 경도 1도가 짧아지므로 도(degree) 스팬은 위도 스팬보다 넓어야 한다
    expect(ne.lng - sw.lng).toBeGreaterThan(latSpan);
  });

  it("한 변 0이면 중심 한 점으로 퇴화한다 (sw === ne === center)", () => {
    const { sw, ne } = cellToBounds(SEOMYEON, 0);

    expect(sw).toEqual(SEOMYEON);
    expect(ne).toEqual(SEOMYEON);
  });

  it("격자 한 변 mock 상수는 500m다 (추정 A4 — 실 API 전환 시 서버 bounds로 교체)", () => {
    expect(CELL_SIDE_METERS).toBe(500);
  });
});
