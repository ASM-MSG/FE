import { describe, expect, it } from "vitest";
import {
  adjustEndHandle,
  adjustStartHandle,
  buildMockHighlights,
  canProceedToNextStep,
  clampSegment,
  createInitialSelection,
  formatTimecode,
  getSelectedSegment,
  moveSegment,
  SEGMENT_MAX_SEC,
  SEGMENT_MIN_SEC,
  selectAi,
  selectManual,
  shouldOfferHighlight,
  toSelectionResult,
} from "./highlight-selection";

describe("shouldOfferHighlight", () => {
  // L1: duration > 5초일 때만 true, 정확히 5초 및 그 이하이면 false
  it("영상 길이가 5초를 초과하면 true를 반환한다", () => {
    expect(shouldOfferHighlight(5.01)).toBe(true);
    expect(shouldOfferHighlight(6)).toBe(true);
    expect(shouldOfferHighlight(60)).toBe(true);
  });

  it("영상 길이가 정확히 5초이거나 그 이하이면 false를 반환한다", () => {
    expect(shouldOfferHighlight(5)).toBe(false);
    expect(shouldOfferHighlight(4.9)).toBe(false);
    expect(shouldOfferHighlight(0)).toBe(false);
  });
});

describe("adjustEndHandle / adjustStartHandle — 최소 5초 clamp", () => {
  // L2: 직접 구간 길이는 최소 5초로 clamp된다
  it("끝 핸들을 시작+5초보다 앞으로 옮기려 하면 시작+5초에서 멈춘다", () => {
    expect(adjustEndHandle({ start: 10, end: 20 }, 12, 100).end).toBe(15);
  });

  it("시작 핸들을 끝-5초보다 뒤로 옮기려 하면 끝-5초에서 멈춘다", () => {
    expect(adjustStartHandle({ start: 10, end: 20 }, 18).start).toBe(15);
  });
});

describe("adjustEndHandle / adjustStartHandle — 최대 30초 clamp", () => {
  // L3: 직접 구간 길이는 최대 30초로 clamp된다
  it("끝 핸들을 시작+30초보다 뒤로 옮기려 하면 시작+30초에서 멈춘다", () => {
    expect(adjustEndHandle({ start: 10, end: 20 }, 50, 100).end).toBe(40);
  });

  it("시작 핸들을 끝-30초보다 앞으로 옮기려 하면 끝-30초에서 멈춘다", () => {
    expect(adjustStartHandle({ start: 20, end: 40 }, 0).start).toBe(10);
  });
});

describe("adjustEndHandle / adjustStartHandle — 영상 경계 [0, duration]", () => {
  // L4: 핸들은 영상 경계를 벗어나지 않는다
  it("시작 핸들은 0 미만으로 이동하지 않는다", () => {
    expect(adjustStartHandle({ start: 5, end: 20 }, -3).start).toBe(0);
  });

  it("끝 핸들은 duration 초과로 이동하지 않는다", () => {
    expect(adjustEndHandle({ start: 80, end: 90 }, 200, 100).end).toBe(100);
  });
});

describe("selectAi / selectManual — 상호 배타 단일 선택", () => {
  // L5: AI 추천 선택과 직접 구간 선택은 동시에 selected 상태가 되지 않는다
  it("AI 추천을 선택하면 직접 지정 구간의 선택이 해제된다", () => {
    const initial = createInitialSelection(100);
    const manual = selectManual(initial, { start: 10, end: 20 });
    expect(manual.mode).toBe("manual");

    const ai = selectAi(manual, {
      id: "mock-1",
      start: 0,
      end: 5,
      reason: "테스트",
    });
    expect(ai.mode).toBe("ai");
    expect(getSelectedSegment(ai)).toEqual({ start: 0, end: 5 });
  });

  it("직접 구간을 지정하면 AI 추천 선택이 해제된다", () => {
    const initial = createInitialSelection(100);
    const ai = selectAi(initial, {
      id: "mock-1",
      start: 0,
      end: 5,
      reason: "테스트",
    });
    expect(ai.mode).toBe("ai");

    const manual = selectManual(ai, { start: 10, end: 20 });
    expect(manual.mode).toBe("manual");
    expect(manual.selectedAi).toBeNull();
    expect(getSelectedSegment(manual)).toEqual({ start: 10, end: 20 });
  });
});

describe("canProceedToNextStep", () => {
  // L6: 선택된 구간이 없으면 false, AI 또는 직접 구간이 선택되면 true
  it("선택된 구간이 없으면 false를 반환한다", () => {
    expect(canProceedToNextStep(createInitialSelection(100))).toBe(false);
  });

  it("AI 추천이 선택되면 true를 반환한다", () => {
    const ai = selectAi(createInitialSelection(100), {
      id: "mock-1",
      start: 0,
      end: 5,
      reason: "테스트",
    });
    expect(canProceedToNextStep(ai)).toBe(true);
  });

  it("직접 구간이 선택되면 true를 반환한다", () => {
    const manual = selectManual(createInitialSelection(100), {
      start: 10,
      end: 20,
    });
    expect(canProceedToNextStep(manual)).toBe(true);
  });
});

describe("formatTimecode", () => {
  // L7: 초를 m:ss 형식으로 포맷한다
  it("초를 m:ss 형식으로 포맷한다", () => {
    expect(formatTimecode(3)).toBe("0:03");
    expect(formatTimecode(42)).toBe("0:42");
    expect(formatTimecode(75)).toBe("1:15");
  });

  it("소수 초는 내림해 포맷한다", () => {
    expect(formatTimecode(3.9)).toBe("0:03");
    expect(formatTimecode(0)).toBe("0:00");
  });
});

describe("buildMockHighlights", () => {
  // L8: 3~5개의 추천 구간, 각 구간은 5~30초 제약과 [0, duration] 범위를 만족한다
  it.each([6, 10, 25, 60, 120])(
    "duration=%d초: 3~5개 구간을 생성하며 각 구간이 제약을 만족한다",
    (duration) => {
      const highlights = buildMockHighlights(duration);
      expect(highlights.length).toBeGreaterThanOrEqual(3);
      expect(highlights.length).toBeLessThanOrEqual(5);

      for (const seg of highlights) {
        const length = seg.end - seg.start;
        expect(seg.start).toBeGreaterThanOrEqual(0);
        expect(seg.end).toBeLessThanOrEqual(duration);
        expect(length).toBeGreaterThanOrEqual(
          Math.min(SEGMENT_MIN_SEC, duration),
        );
        expect(length).toBeLessThanOrEqual(SEGMENT_MAX_SEC);
        expect(seg.reason.length).toBeGreaterThan(0);
      }
    },
  );

  it("각 구간에 고유 id와 사유 텍스트가 있다", () => {
    const highlights = buildMockHighlights(120);
    const ids = new Set(highlights.map((h) => h.id));
    expect(ids.size).toBe(highlights.length);
  });

  it.each([5.5, 6, 7, 7.5, 9])(
    "duration=%d초(5초 초과 경계 근처): 구간끼리 시작 시각이 겹치지 않는다",
    (duration) => {
      const highlights = buildMockHighlights(duration);
      const starts = new Set(highlights.map((h) => h.start));
      expect(starts.size).toBe(highlights.length);
    },
  );
});

describe("toSelectionResult", () => {
  // L9: 시작 시각·끝 시각·선택 방식을 담은 payload를 반환한다
  it("AI 선택 결과는 start·end·mode('ai')를 담는다", () => {
    const ai = selectAi(createInitialSelection(100), {
      id: "mock-1",
      start: 3,
      end: 12,
      reason: "테스트",
    });
    expect(toSelectionResult(ai)).toEqual({ start: 3, end: 12, mode: "ai" });
  });

  it("직접 구간 선택 결과는 start·end·mode('manual')을 담는다", () => {
    const manual = selectManual(createInitialSelection(100), {
      start: 10,
      end: 40,
    });
    expect(toSelectionResult(manual)).toEqual({
      start: 10,
      end: 40,
      mode: "manual",
    });
  });

  it("선택이 없으면 null을 반환한다", () => {
    expect(toSelectionResult(createInitialSelection(100))).toBeNull();
  });
});

describe("clampSegment / moveSegment — 트리머 보조", () => {
  it("clampSegment는 길이를 5~30초와 [0, duration] 범위로 정규화한다", () => {
    // 너무 짧은 구간은 최소 5초로 확장
    expect(clampSegment({ start: 10, end: 12 }, 100)).toEqual({
      start: 10,
      end: 15,
    });
    // 너무 긴 구간은 최대 30초로 축소
    expect(clampSegment({ start: 10, end: 90 }, 100)).toEqual({
      start: 10,
      end: 40,
    });
    // duration보다 큰 구간은 영상 범위로 제한
    expect(clampSegment({ start: 4, end: 6 }, 5)).toEqual({
      start: 0,
      end: 5,
    });
  });

  it("moveSegment는 길이를 유지한 채 구간을 이동하고 경계에서 멈춘다", () => {
    expect(moveSegment({ start: 10, end: 20 }, 5, 100)).toEqual({
      start: 15,
      end: 25,
    });
    // 오른쪽 경계 초과 시 길이 유지하며 정지
    expect(moveSegment({ start: 90, end: 100 }, 20, 100)).toEqual({
      start: 90,
      end: 100,
    });
    // 왼쪽 경계 초과 시 0에서 정지
    expect(moveSegment({ start: 5, end: 15 }, -20, 100)).toEqual({
      start: 0,
      end: 10,
    });
  });
});
