import { describe, expect, it } from "vitest";
import { buildRouteLegs, formatWalkDistance } from "./route-legs";

/** 서면 일대 실좌표 근사 — 이웃 간 수백 m 간격 (MVP 지역 부산 서면) */
const STOPS = [
  { order: 1, lat: 35.1568, lng: 129.0594 },
  { order: 2, lat: 35.1601, lng: 129.0621 },
  { order: 3, lat: 35.1633, lng: 129.0668 },
];

describe("formatWalkDistance — 도보 거리 표기 (L3, Q6)", () => {
  it("1000m 미만은 10m 단위로 반올림해 m로 적는다 (L3)", () => {
    expect(formatWalkDistance(604)).toBe("도보 약 600m");
    expect(formatWalkDistance(447)).toBe("도보 약 450m");
  });

  it("1000m 이상은 소수 1자리 km로 적는다 (L3)", () => {
    expect(formatWalkDistance(1234)).toBe("도보 약 1.2km");
  });

  it("반올림으로 1000m에 닿으면 km 표기로 넘어간다 — '1000m'는 나오지 않는다 (경계)", () => {
    expect(formatWalkDistance(999.6)).toBe("도보 약 1.0km");
  });
});

describe("buildRouteLegs — 이웃 지점 직선 거리 구간 (L3)", () => {
  it("지점이 N개면 이웃 쌍마다 N-1개 구간을 만든다 (L3)", () => {
    const legs = buildRouteLegs(STOPS);

    expect(legs).toHaveLength(2);
    expect(legs.map((leg) => [leg.fromOrder, leg.toOrder])).toEqual([
      [1, 2],
      [2, 3],
    ]);
  });

  it("구간 거리는 이웃 좌표의 직선(하버사인) 거리이고 문구가 함께 붙는다 (L3)", () => {
    const [first] = buildRouteLegs(STOPS);

    // 서면 좌표 두 점의 하버사인 실측 ≈ 441m — 10m 반올림으로 440m
    expect(Math.round(first.meters)).toBe(441);
    expect(first.label).toBe("도보 약 440m");
  });

  it("지점이 1개 이하면 구간이 없다 (L3, 경계)", () => {
    expect(buildRouteLegs([STOPS[0]])).toEqual([]);
    expect(buildRouteLegs([])).toEqual([]);
  });
});
