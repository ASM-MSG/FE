import { describe, expect, it } from "vitest";
import {
  clipLineToBoundary,
  pointInPolygon,
  type BoundaryMultiPolygon,
} from "./boundary-geometry";

/**
 * 합성 경계 픽스처 — lat/lng를 소수 단위 좌표로 쓴 기하 도형 (실데이터 판정은 busan-boundary.test).
 * U자(오목) 본토: (lng 0~3, lat 0~3)에서 위쪽 가운데 홈(lng 1~2, lat 1~3)이 파인 형태.
 * 링은 마지막 점 = 첫 점 중복 없는 열린 링(암시적 폐합)이다.
 */
const U_SHAPE: BoundaryMultiPolygon = [
  [
    [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 3 },
      { lat: 3, lng: 3 },
      { lat: 3, lng: 2 },
      { lat: 1, lng: 2 },
      { lat: 1, lng: 1 },
      { lat: 3, lng: 1 },
      { lat: 3, lng: 0 },
    ],
  ],
];

/** U자 본토 + 떨어진 섬(lng 5~6, lat 1.5~2.5) — MultiPolygon 판정용 */
const U_WITH_ISLAND: BoundaryMultiPolygon = [
  ...U_SHAPE,
  [
    [
      { lat: 1.5, lng: 5 },
      { lat: 1.5, lng: 6 },
      { lat: 2.5, lng: 6 },
      { lat: 2.5, lng: 5 },
    ],
  ],
];

/** 정사각(0~3) 본토에 홀(1~2)이 뚫린 폴리곤 — 내수면(홀) 판정용 */
const SQUARE_WITH_HOLE: BoundaryMultiPolygon = [
  [
    [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 3 },
      { lat: 3, lng: 3 },
      { lat: 3, lng: 0 },
    ],
    [
      { lat: 1, lng: 1 },
      { lat: 1, lng: 2 },
      { lat: 2, lng: 2 },
      { lat: 2, lng: 1 },
    ],
  ],
];

describe("pointInPolygon — 셀 중심 경계 내부 판정 (MSG-263 AC 4)", () => {
  it("경계 내부는 참, 외부는 거짓이다", () => {
    expect(pointInPolygon({ lat: 0.5, lng: 1.5 }, U_SHAPE)).toBe(true);
    expect(pointInPolygon({ lat: 2, lng: 0.5 }, U_SHAPE)).toBe(true);
    expect(pointInPolygon({ lat: 4, lng: 1.5 }, U_SHAPE)).toBe(false);
    expect(pointInPolygon({ lat: -1, lng: 1.5 }, U_SHAPE)).toBe(false);
  });

  it("오목 홈 안(경계 밖)은 거짓이다", () => {
    expect(pointInPolygon({ lat: 2, lng: 1.5 }, U_SHAPE)).toBe(false);
  });

  it("MultiPolygon을 지원한다 — 떨어진 섬 내부도 참, 본토·섬 사이 바다는 거짓", () => {
    expect(pointInPolygon({ lat: 2, lng: 5.5 }, U_WITH_ISLAND)).toBe(true);
    expect(pointInPolygon({ lat: 2, lng: 4 }, U_WITH_ISLAND)).toBe(false);
  });

  it("홀(내수면) 안은 거짓이다", () => {
    expect(pointInPolygon({ lat: 1.5, lng: 1.5 }, SQUARE_WITH_HOLE)).toBe(false);
    expect(pointInPolygon({ lat: 0.5, lng: 1.5 }, SQUARE_WITH_HOLE)).toBe(true);
  });
});

describe("clipLineToBoundary — 격자선 경계 절단 (MSG-263 AC 3)", () => {
  it("오목 경계를 가로지르는 수평선이 내부 구간 다중 선분으로 나뉜다 — 홈 구간은 결과에 없다", () => {
    const segments = clipLineToBoundary(
      { axis: "h", lat: 2, fromLng: -1, toLng: 4 },
      U_SHAPE,
    );

    expect(segments).toHaveLength(2);
    const [left, right] = segments;
    expect(left[0].lng).toBeCloseTo(0, 10);
    expect(left[1].lng).toBeCloseTo(1, 10);
    expect(right[0].lng).toBeCloseTo(2, 10);
    expect(right[1].lng).toBeCloseTo(3, 10);
    for (const [a, b] of segments) {
      expect(a.lat).toBe(2);
      expect(b.lat).toBe(2);
    }
  });

  it("수직선도 같은 규칙으로 절단된다 — 홈 아래 본토 구간만 남는다", () => {
    const segments = clipLineToBoundary(
      { axis: "v", lng: 1.5, fromLat: -1, toLat: 4 },
      U_SHAPE,
    );

    expect(segments).toHaveLength(1);
    expect(segments[0][0].lat).toBeCloseTo(0, 10);
    expect(segments[0][1].lat).toBeCloseTo(1, 10);
    expect(segments[0][0].lng).toBe(1.5);
  });

  it("MultiPolygon의 모든 조각이 절단 결과에 반영된다 — 본토 2구간 + 섬 1구간", () => {
    const segments = clipLineToBoundary(
      { axis: "h", lat: 2, fromLng: -1, toLng: 7 },
      U_WITH_ISLAND,
    );

    expect(segments).toHaveLength(3);
    expect(segments[2][0].lng).toBeCloseTo(5, 10);
    expect(segments[2][1].lng).toBeCloseTo(6, 10);
  });

  it("홀을 가로지르는 선은 홀 구간이 제외되어 갈라진다", () => {
    const segments = clipLineToBoundary(
      { axis: "h", lat: 1.5, fromLng: -1, toLng: 4 },
      SQUARE_WITH_HOLE,
    );

    expect(segments).toHaveLength(2);
    expect(segments[0][1].lng).toBeCloseTo(1, 10);
    expect(segments[1][0].lng).toBeCloseTo(2, 10);
  });

  it("선의 범위(from~to)로 잘린다 — 양끝이 내부인 선은 요청 범위 그대로다", () => {
    const segments = clipLineToBoundary(
      { axis: "h", lat: 0.5, fromLng: 1.2, toLng: 1.8 },
      U_SHAPE,
    );

    expect(segments).toHaveLength(1);
    expect(segments[0][0].lng).toBeCloseTo(1.2, 10);
    expect(segments[0][1].lng).toBeCloseTo(1.8, 10);
  });

  it("경계 밖 전용 선은 빈 배열이다", () => {
    expect(
      clipLineToBoundary({ axis: "h", lat: 5, fromLng: -1, toLng: 4 }, U_SHAPE),
    ).toEqual([]);
    expect(
      clipLineToBoundary({ axis: "v", lng: 8, fromLat: 0, toLat: 3 }, U_WITH_ISLAND),
    ).toEqual([]);
  });
});
