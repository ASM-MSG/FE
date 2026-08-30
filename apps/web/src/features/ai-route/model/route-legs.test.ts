import { describe, expect, it } from "vitest";
import type { WalkSegmentDto } from "@/shared/api/generated";
import {
  buildRouteLegs,
  buildWalkSegments,
  formatWalkDistance,
  isWithinKoreaRange,
} from "./route-legs";

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

/** 서면 일대 좌표만 쓰는 세그먼트 픽스처 헬퍼 (MVP 지역 부산 서면) */
const coord = (index: number) => ({
  lat: 35.1568 + index * 0.0033,
  lng: 129.0594 + index * 0.0027,
});
const coords = (count: number) =>
  Array.from({ length: count }, (_, index) => coord(index));

/** walk-paths 응답 세그먼트 픽스처 — 해결/미해결만 구분하면 되는 자리 */
const resolvedSegment = (
  distance: number,
  path: { lat: number; lng: number }[] = [],
): WalkSegmentDto => ({
  resolved: true,
  path,
  distanceMeters: distance,
});
const unresolvedSegment = (): WalkSegmentDto => ({
  resolved: false,
  path: null,
  distanceMeters: null,
});

describe("buildWalkSegments — walk-paths 요청 DTO 변환 (L1·L2)", () => {
  it("이웃 좌표쌍마다 세그먼트 하나를 순서대로 만든다 (L1)", () => {
    const segments = buildWalkSegments(coords(3));

    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({
      startLat: coord(0).lat,
      startLng: coord(0).lng,
      endLat: coord(1).lat,
      endLng: coord(1).lng,
    });
    expect(segments[1].startLat).toBe(coord(1).lat);
    expect(segments[1].endLat).toBe(coord(2).lat);
  });

  it("좌표가 1개 이하면 세그먼트를 만들지 않는다 (L1, 경계)", () => {
    expect(buildWalkSegments(coords(1))).toEqual([]);
    expect(buildWalkSegments([])).toEqual([]);
  });

  it("좌표가 9개(출발지 1 + 지점 8)면 세그먼트가 8개이고 첫 세그먼트가 첫 좌표에서 출발한다 (L2)", () => {
    const segments = buildWalkSegments(coords(9));

    expect(segments).toHaveLength(8);
    expect(segments[0].startLat).toBe(coord(0).lat);
    expect(segments[0].endLat).toBe(coord(1).lat);
  });

  it("좌표가 9개를 넘으면 앞에서 8개 세그먼트만 만든다 — 서버 400 방어 (L2, Q10)", () => {
    const segments = buildWalkSegments(coords(12));

    expect(segments).toHaveLength(8);
    expect(segments[0].startLat).toBe(coord(0).lat);
    expect(segments[7].endLat).toBe(coord(8).lat);
  });
});

describe("isWithinKoreaRange — 확정 실패 요청 사전 차단 (L3, Q3)", () => {
  it("모든 좌표가 위도 33~39·경도 124~132 안이면 true다 (L3)", () => {
    expect(isWithinKoreaRange(coords(3))).toBe(true);
  });

  it("좌표가 하나라도 범위 밖이면 false다 (L3)", () => {
    expect(isWithinKoreaRange([coord(0), { lat: 41.2, lng: 129.0 }])).toBe(
      false,
    );
    expect(isWithinKoreaRange([coord(0), { lat: 35.15, lng: 139.7 }])).toBe(
      false,
    );
  });
});

describe("buildRouteLegs — walk-paths 실보행 거리 반영 (L4~L8·L11)", () => {
  it("walk를 주지 않으면 직선 거리 결과에 resolved:false만 실린다 (L4, 회귀 고정)", () => {
    const legs = buildRouteLegs(STOPS);

    expect(legs.map((leg) => leg.resolved)).toEqual([false, false]);
    expect(Math.round(legs[0].meters)).toBe(441);
    expect(legs[0].label).toBe("도보 약 440m");
  });

  it("resolved:true 구간은 서버 실거리와 그 표기, resolved:true를 싣는다 (L5)", () => {
    const legs = buildRouteLegs(STOPS, {
      segments: [resolvedSegment(604), resolvedSegment(1234)],
    });

    expect(legs[0].meters).toBe(604);
    expect(legs[0].label).toBe("도보 약 600m");
    expect(legs[0].resolved).toBe(true);
  });

  it("실거리도 직선과 같은 formatWalkDistance 규칙으로 적는다 (L8, Q1)", () => {
    const legs = buildRouteLegs(STOPS, {
      segments: [resolvedSegment(604), resolvedSegment(1234)],
    });

    expect(legs[1].label).toBe("도보 약 1.2km");
  });

  it("resolved:false·distanceMeters null·대응 세그먼트 없음은 직선 거리와 resolved:false다 (L5)", () => {
    const nullDistance: WalkSegmentDto = {
      resolved: true,
      path: [],
      distanceMeters: null,
    };

    const legs = buildRouteLegs(STOPS, {
      segments: [unresolvedSegment(), nullDistance],
    });

    expect(legs.map((leg) => leg.resolved)).toEqual([false, false]);
    expect(Math.round(legs[0].meters)).toBe(441);
    expect(legs[0].label).toBe("도보 약 440m");
  });

  it("부분 해결이면 실거리 구간과 직선 구간이 섞여 나온다 (L6)", () => {
    const legs = buildRouteLegs(STOPS, {
      segments: [resolvedSegment(604), unresolvedSegment()],
    });

    expect(legs.map((leg) => leg.resolved)).toEqual([true, false]);
    expect(legs[0].meters).toBe(604);
    expect(Math.round(legs[1].meters)).not.toBe(604);
  });

  it("originOffset이 1이면 leg i가 segments[i+1]에 대응한다 — 출발지 구간을 건너뛴다 (L7)", () => {
    const legs = buildRouteLegs(STOPS, {
      segments: [
        resolvedSegment(111),
        resolvedSegment(604),
        resolvedSegment(1234),
      ],
      originOffset: 1,
    });

    expect(legs.map((leg) => leg.meters)).toEqual([604, 1234]);
  });

  it("응답 세그먼트 개수가 요청 개수와 다르면 walk 결과를 통째로 버린다 (L11, Q9)", () => {
    const legs = buildRouteLegs(STOPS, { segments: [resolvedSegment(604)] });

    expect(legs.map((leg) => leg.resolved)).toEqual([false, false]);
    expect(Math.round(legs[0].meters)).toBe(441);
  });
});
