import { describe, expect, it } from "vitest";
import { MOCK_SEGMENTS } from "./mock-segments";

describe("mock-segments (MSG-303 AC 5)", () => {
  it("mock 추천 구간 데이터가 Figma 정본 5개와 일치한다 — 시간 범위·사유 (AC 5)", () => {
    expect(
      MOCK_SEGMENTS.map((segment) => [segment.timeRange, segment.reason]),
    ).toEqual([
      ["0:03 – 0:08", "움직임·밝기 지속"],
      ["0:14 – 0:19", "장면 변화 풍부"],
      ["0:21 – 0:26", "조회수 예측 상위"],
      ["0:25 – 0:30", "색감·구도 안정적"],
      ["0:28 – 0:33", "동작 다이나믹"],
    ]);
  });

  it("구간 id는 고유하다 — 단일 선택 전이(303 AC 7)의 전제", () => {
    const ids = MOCK_SEGMENTS.map((segment) => segment.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
