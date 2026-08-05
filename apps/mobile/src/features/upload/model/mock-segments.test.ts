import { describe, expect, it } from "vitest";
import { MOCK_SEGMENTS } from "./mock-segments";

describe("mock-segments (MSG-303 AC 5)", () => {
  it("mock 추천 구간은 3개 고정이다 — 시간 범위·사유 (AC 5, 2026-08-05 기획 변경: 5개→3개)", () => {
    expect(
      MOCK_SEGMENTS.map((segment) => [segment.timeRange, segment.reason]),
    ).toEqual([
      ["0:03 – 0:08", "움직임·밝기 지속"],
      ["0:14 – 0:19", "장면 변화 풍부"],
      ["0:21 – 0:26", "조회수 예측 상위"],
    ]);
  });

  it("구간 id는 고유하다 — 단일 선택 전이(303 AC 7)의 전제", () => {
    const ids = MOCK_SEGMENTS.map((segment) => segment.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
