import { describe, expect, it } from "vitest";
import type { CourseSpot } from "./course";
import { gridContextLine } from "./grid-context-line";

const spot = (visited: boolean): CourseSpot => ({
  gridId: "16858_11420",
  position: { lat: 35.15, lng: 129.05 },
  order: 1,
  visited,
});

const base = {
  spot: null,
  courseTitle: undefined,
  isHotChip: false,
  hotGridCount: 0,
  collectedSinceLabel: null,
  progressFailed: false,
} as const;

describe("gridContextLine — 코스 스팟에서 내려온 상세 (AC 24)", () => {
  it("코스명·순번·방문 여부를 잇는다", () => {
    expect(
      gridContextLine({
        ...base,
        spot: spot(true),
        courseTitle: "남파랑길 3코스",
      }),
    ).toBe("남파랑길 3코스 1번째 스팟 · 방문 완료");
  });

  it("진행도 조회가 실패하면 방문 여부를 주장하지 않는다 (리뷰 반영)", () => {
    expect(
      gridContextLine({
        ...base,
        spot: spot(false),
        courseTitle: "남파랑길 3코스",
        progressFailed: true,
      }),
    ).toBe("남파랑길 3코스 1번째 스팟");
  });
});

describe("gridContextLine — 핫구역에서 내려온 상세 (AC 11)", () => {
  it("핫구역 칸 수와 점령 시작일을 잇는다", () => {
    expect(
      gridContextLine({
        ...base,
        isHotChip: true,
        hotGridCount: 4,
        collectedSinceLabel: "8월 12일부터 내가 점령 중",
      }),
    ).toBe("핫구역 안 4칸 · 8월 12일부터 내가 점령 중");
  });

  it("점령 격자가 아니면 칸 수만 남는다 (경계)", () => {
    expect(gridContextLine({ ...base, isHotChip: true, hotGridCount: 4 })).toBe(
      "핫구역 안 4칸",
    );
  });

  it("진행도 조회가 실패하면 점령 문구를 빼고 칸 수만 남긴다 (리뷰 반영)", () => {
    expect(
      gridContextLine({
        ...base,
        isHotChip: true,
        hotGridCount: 4,
        collectedSinceLabel: "8월 12일부터 내가 점령 중",
        progressFailed: true,
      }),
    ).toBe("핫구역 안 4칸");
  });

  it("칩이 없으면 맥락 줄이 없다 (경계)", () => {
    expect(gridContextLine(base)).toBeUndefined();
  });
});
