import { describe, expect, it } from "vitest";
import { buildRouteLegs, formatWalkDistance } from "./route-legs";

/**
 * L4: 도보 거리 표기와 이웃 쌍 구간 파생이 웹 `route-legs.ts`의 `buildRouteLegs(points)`
 * (walk 미지정 = 직선 폴백)와 동치다 (MSG-556). walk-paths 계열은 MSG-490 몫이라 대조하지 않는다.
 * 웹 원본은 변수 경로 동적 import (map-scale.parity.test.ts 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/ai-route/model/route-legs.ts",
  import.meta.url,
).pathname;

interface WebLeg {
  fromOrder: number;
  toOrder: number;
  meters: number;
  label: string;
}

interface WebRouteLegs {
  formatWalkDistance: (meters: number) => string;
  buildRouteLegs: (
    points: { order: number; lat: number; lng: number }[],
  ) => WebLeg[];
}

const loadWeb = (): Promise<WebRouteLegs> => import(WEB_PATH);

/** 서면 일대 실좌표 근사 — 이웃 간 수백 m 간격 */
const STOPS = [
  { order: 1, lat: 35.1568, lng: 129.0594 },
  { order: 2, lat: 35.1601, lng: 129.0621 },
  { order: 3, lat: 35.1633, lng: 129.0668 },
];

const METERS_SAMPLES = [0, 4, 5, 447, 604, 995, 999.6, 1000, 1234, 12345.6];

describe("route-legs 동등성 (L4)", () => {
  it("formatWalkDistance가 1000m 미만 10m 반올림 m·이상 소수 1자리 km로 웹과 같은 문구를 낸다", async () => {
    const web = await loadWeb();

    for (const meters of METERS_SAMPLES) {
      expect(formatWalkDistance(meters)).toBe(web.formatWalkDistance(meters));
    }
    expect(formatWalkDistance(604)).toBe("도보 약 600m");
    expect(formatWalkDistance(1234)).toBe("도보 약 1.2km");
    expect(formatWalkDistance(999.6)).toBe("도보 약 1.0km");
  });

  it("buildRouteLegs(points)가 order 정렬 후 이웃쌍 n-1개를 웹과 같은 fromOrder·toOrder·meters·label로 만든다", async () => {
    const web = await loadWeb();
    const shuffled = [STOPS[2], STOPS[0], STOPS[1]];

    for (const input of [STOPS, shuffled]) {
      const legs = buildRouteLegs(input);
      const webLegs = web.buildRouteLegs(input);
      expect(legs).toHaveLength(webLegs.length);
      legs.forEach((leg, i) => {
        expect(leg.fromOrder).toBe(webLegs[i].fromOrder);
        expect(leg.toOrder).toBe(webLegs[i].toOrder);
        expect(leg.meters).toBe(webLegs[i].meters);
        expect(leg.label).toBe(webLegs[i].label);
      });
    }
    expect(
      buildRouteLegs(shuffled).map((l) => [l.fromOrder, l.toOrder]),
    ).toEqual([
      [1, 2],
      [2, 3],
    ]);
    expect(buildRouteLegs(STOPS)[0].label).toBe("도보 약 440m");
  });

  it("지점이 1개 이하면 구간이 없다 — 웹과 같은 빈 배열 (경계)", async () => {
    const web = await loadWeb();

    expect(buildRouteLegs([STOPS[0]])).toEqual(web.buildRouteLegs([STOPS[0]]));
    expect(buildRouteLegs([])).toEqual([]);
    expect(buildRouteLegs([STOPS[0]])).toEqual([]);
  });

  it("입력 배열을 제자리 정렬하지 않는다 — 스토어 points 참조를 그대로 넘겨도 순서가 보존된다", () => {
    const shuffled = [STOPS[2], STOPS[0], STOPS[1]];

    buildRouteLegs(shuffled);

    expect(shuffled.map((s) => s.order)).toEqual([3, 1, 2]);
  });
});
