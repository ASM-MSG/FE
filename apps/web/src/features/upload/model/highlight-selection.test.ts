import { describe, expect, it } from "vitest";
import {
  adjustEndHandle,
  adjustStartHandle,
  clampSegment,
  createInitialSelection,
  formatSegmentLabel,
  formatTimecode,
  fromServerHighlights,
  getSelectedSegment,
  moveSegment,
  SEGMENT_MAX_SEC,
  SEGMENT_MIN_SEC,
  selectAi,
  selectManual,
} from "./highlight-selection";

/**
 * MSG-329 재설계 — 목 추천 생성(buildMockHighlights·사유 라벨)은 폐기됐다.
 * 추천은 서버 선분석 응답 [[시작,끝]]에서 파생하고(B6), 수동 상한은 28초다(B7 —
 * 키프레임 밀림 대비 durationSec≤30 여유, 티켓 13 확정).
 */
describe("fromServerHighlights — 서버 [[시작,끝]] 응답을 추천 목록으로 변환한다 (B6)", () => {
  it("배열 순서를 보존해 1~3개 추천을 만든다 — 순서가 추천 우선순위다", () => {
    const suggestions = fromServerHighlights([
      [3, 8],
      [12, 18.5],
      [20, 27.5],
    ]);
    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((s) => [s.start, s.end])).toEqual([
      [3, 8],
      [12, 18.5],
      [20, 27.5],
    ]);
  });

  it("각 추천은 고유 id를 가진다 — 카드 선택 식별용", () => {
    const suggestions = fromServerHighlights([
      [0, 5],
      [10, 16],
    ]);
    expect(new Set(suggestions.map((s) => s.id)).size).toBe(2);
  });

  it("null·빈 배열은 빈 목록이다 (스킵 흐름과 정합, 리스크 8)", () => {
    expect(fromServerHighlights(null)).toEqual([]);
    expect(fromServerHighlights([])).toEqual([]);
  });

  it("시간쌍이 아닌 형상(원소 부족·역전)은 걸러낸다 — 명세 위반 응답 방어", () => {
    expect(fromServerHighlights([[5], [8, 3], [0, 5]])).toHaveLength(1);
  });
});

describe("createInitialSelection — 첫 번째 추천이 기본 선택된다 (B6)", () => {
  it("추천이 있으면 mode=ai + 첫 번째 추천이 선택 상태다", () => {
    const suggestions = fromServerHighlights([
      [3, 8],
      [12, 18],
    ]);
    const state = createInitialSelection(60, suggestions);
    expect(state.mode).toBe("ai");
    expect(getSelectedSegment(state)).toEqual({ start: 3, end: 8 });
  });

  it("추천이 없으면(3502 폴백) mode=manual — 직접 구간 지정 모드로 진입한다 (B5)", () => {
    const state = createInitialSelection(60, []);
    expect(state.mode).toBe("manual");
    expect(getSelectedSegment(state)).toEqual(state.manualSegment);
  });

  it("초기 수동 구간은 5~28초 길이·[0, duration] 범위를 만족한다", () => {
    const state = createInitialSelection(100, []);
    const length = state.manualSegment.end - state.manualSegment.start;
    expect(length).toBeGreaterThanOrEqual(SEGMENT_MIN_SEC);
    expect(length).toBeLessThanOrEqual(SEGMENT_MAX_SEC);
    expect(state.manualSegment.start).toBeGreaterThanOrEqual(0);
    expect(state.manualSegment.end).toBeLessThanOrEqual(100);
  });
});

describe("selectAi / selectManual — 상호 배타 선택", () => {
  it("카드 선택 시 해당 추천 구간이 선택 구간이 된다 (B7)", () => {
    const suggestions = fromServerHighlights([
      [3, 8],
      [12, 18],
    ]);
    const state = selectAi(
      createInitialSelection(60, suggestions),
      suggestions[1],
    );
    expect(getSelectedSegment(state)).toEqual({ start: 12, end: 18 });
  });

  it("직접 구간 지정 시 AI 선택이 해제되고 수동 구간이 선택 구간이 된다", () => {
    const suggestions = fromServerHighlights([[3, 8]]);
    const state = selectManual(createInitialSelection(60, suggestions), {
      start: 30,
      end: 40,
    });
    expect(state.mode).toBe("manual");
    expect(state.selectedAi).toBeNull();
    expect(getSelectedSegment(state)).toEqual({ start: 30, end: 40 });
  });
});

describe("직접 구간 지정 상한 28초·하한 5초 (B7)", () => {
  it("상한 상수는 28초, 하한 상수는 5초다 — 구 30초 상한은 폐기 (티켓 13 확정)", () => {
    expect(SEGMENT_MAX_SEC).toBe(28);
    expect(SEGMENT_MIN_SEC).toBe(5);
  });

  it("끝 핸들은 시작+28초에서 멈춘다", () => {
    expect(adjustEndHandle({ start: 10, end: 20 }, 50, 100).end).toBe(38);
  });

  it("시작 핸들은 끝-28초에서 멈춘다", () => {
    expect(adjustStartHandle({ start: 20, end: 40 }, 0).start).toBe(12);
  });

  it("끝 핸들은 시작+5초보다 앞으로 못 가고, 시작 핸들은 끝-5초보다 뒤로 못 간다", () => {
    expect(adjustEndHandle({ start: 10, end: 20 }, 12, 100).end).toBe(15);
    expect(adjustStartHandle({ start: 10, end: 20 }, 18).start).toBe(15);
  });

  it("핸들은 [0, duration] 경계를 벗어나지 않는다", () => {
    expect(adjustStartHandle({ start: 3, end: 10 }, -5).start).toBe(0);
    expect(adjustEndHandle({ start: 3, end: 10 }, 99, 12).end).toBe(12);
  });

  it("clampSegment는 5~28초 길이·[0, duration] 범위로 정규화한다", () => {
    expect(clampSegment({ start: 0, end: 60 }, 100)).toEqual({
      start: 0,
      end: 28,
    });
    expect(clampSegment({ start: 0, end: 2 }, 100)).toEqual({
      start: 0,
      end: 5,
    });
  });

  it("moveSegment는 길이를 유지한 채 경계에서 정지한다", () => {
    expect(moveSegment({ start: 10, end: 20 }, 100, 60)).toEqual({
      start: 50,
      end: 60,
    });
    expect(moveSegment({ start: 10, end: 20 }, -100, 60)).toEqual({
      start: 0,
      end: 10,
    });
  });
});

describe("시간 표기 — 카드는 시간 정보 중심이다 (B6, 사유 라벨 없음)", () => {
  it("formatTimecode는 m:ss 형식이다", () => {
    expect(formatTimecode(3)).toBe("0:03");
    expect(formatTimecode(75)).toBe("1:15");
  });

  it("formatSegmentLabel은 '0:03 – 0:08 · 5초' 형식이다", () => {
    expect(formatSegmentLabel({ start: 3, end: 8 })).toBe("0:03 – 0:08 · 5초");
    expect(formatSegmentLabel({ start: 12, end: 18.5 })).toBe(
      "0:12 – 0:18 · 7초",
    );
  });
});
