import { describe, expect, it } from "vitest";
import { pointInPolygon, type BoundaryMultiPolygon } from "./boundary-geometry";

/**
 * 합성 경계 픽스처 — lat/lng를 소수 단위 좌표로 쓴 기하 도형 (부산 경계 실데이터는 MSG-477에서 절단 제거와 함께 삭제).
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
    expect(pointInPolygon({ lat: 1.5, lng: 1.5 }, SQUARE_WITH_HOLE)).toBe(
      false,
    );
    expect(pointInPolygon({ lat: 0.5, lng: 1.5 }, SQUARE_WITH_HOLE)).toBe(true);
  });
});
