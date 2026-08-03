import { describe, expect, it } from "vitest";
import {
  buildMockBlurRegions,
  formatBlurCompletion,
  formatBlurCount,
  summarizeBlurRegions,
  toBlurConfirmResult,
} from "./blur-detection";

describe("buildMockBlurRegions", () => {
  // L3: 기본 얼굴 2개·번호판 1개, 총 3개. 각 영역이 종류·라벨·오버레이 위치(box)를 담는다
  it("기본 얼굴 2개·번호판 1개로 총 3개 감지 영역을 반환한다", () => {
    const regions = buildMockBlurRegions();
    expect(regions).toHaveLength(3);
    expect(regions.filter((r) => r.kind === "face")).toHaveLength(2);
    expect(regions.filter((r) => r.kind === "plate")).toHaveLength(1);
  });

  it("각 영역이 종류·라벨·오버레이 위치(box)를 담는다", () => {
    for (const region of buildMockBlurRegions()) {
      expect(region.kind === "face" || region.kind === "plate").toBe(true);
      expect(typeof region.label).toBe("string");
      expect(region.label.length).toBeGreaterThan(0);
      expect(typeof region.box.x).toBe("number");
      expect(typeof region.box.y).toBe("number");
      expect(typeof region.box.w).toBe("number");
      expect(typeof region.box.h).toBe("number");
    }
  });

  it("각 영역에 고유 id가 있다", () => {
    const regions = buildMockBlurRegions();
    const ids = new Set(regions.map((r) => r.id));
    expect(ids.size).toBe(regions.length);
  });

  // L4: 종류별로 1부터 번호가 매겨져 "얼굴 1", "얼굴 2", "번호판 1" 형식으로 생성된다
  it("라벨이 종류별로 1부터 번호가 매겨진다 (얼굴 1, 얼굴 2, 번호판 1)", () => {
    const labels = buildMockBlurRegions().map((r) => r.label);
    expect(labels).toEqual(["얼굴 1", "얼굴 2", "번호판 1"]);
  });
});

describe("summarizeBlurRegions", () => {
  // L5: 얼굴 수·번호판 수를 정확히 집계 (기본 목업 기준 얼굴 2, 번호판 1)
  it("기본 목업 감지 영역을 얼굴 2·번호판 1로 집계한다", () => {
    expect(summarizeBlurRegions(buildMockBlurRegions())).toEqual({
      faces: 2,
      plates: 1,
    });
  });

  it("임의 감지 영역의 얼굴 수·번호판 수를 정확히 집계한다", () => {
    const regions = [
      {
        id: "a",
        kind: "face" as const,
        label: "얼굴 1",
        box: { x: 0, y: 0, w: 1, h: 1 },
      },
      {
        id: "b",
        kind: "plate" as const,
        label: "번호판 1",
        box: { x: 0, y: 0, w: 1, h: 1 },
      },
      {
        id: "c",
        kind: "plate" as const,
        label: "번호판 2",
        box: { x: 0, y: 0, w: 1, h: 1 },
      },
    ];
    expect(summarizeBlurRegions(regions)).toEqual({ faces: 1, plates: 2 });
  });
});

describe("formatBlurCompletion", () => {
  // L6: 집계 기준으로 "AI 자동 블러 완료 — 얼굴 N개, 번호판 M개를 자동으로 가렸어요"
  it("완료 문구를 집계 수치로 채워 반환한다", () => {
    expect(formatBlurCompletion({ faces: 2, plates: 1 })).toBe(
      "AI 자동 블러 완료 — 얼굴 2개, 번호판 1개를 자동으로 가렸어요",
    );
  });

  it("다른 집계 수치도 문구에 반영한다", () => {
    expect(formatBlurCompletion({ faces: 3, plates: 0 })).toBe(
      "AI 자동 블러 완료 — 얼굴 3개, 번호판 0개를 자동으로 가렸어요",
    );
  });
});

describe("formatBlurCount", () => {
  // L2 (MSG-120): "{count}개 처리됨" — 0도 항목을 숨기지 않고 "0개 처리됨"을 반환한다
  it("처리 개수를 'N개 처리됨' 형식으로 반환한다", () => {
    expect(formatBlurCount(2)).toBe("2개 처리됨");
    expect(formatBlurCount(1)).toBe("1개 처리됨");
  });

  it("0개도 항목을 숨기지 않고 '0개 처리됨'을 반환한다", () => {
    expect(formatBlurCount(0)).toBe("0개 처리됨");
  });
});

describe("toBlurConfirmResult", () => {
  // L7: 감지 요약(얼굴 수·번호판 수)과 영상 길이를 담은 콘솔 로그 payload 객체 (Q4)
  it("감지 요약과 영상 길이(초)를 담은 payload를 반환한다", () => {
    expect(toBlurConfirmResult({ faces: 2, plates: 1 }, 42)).toEqual({
      summary: { faces: 2, plates: 1 },
      duration: 42,
    });
  });
});
