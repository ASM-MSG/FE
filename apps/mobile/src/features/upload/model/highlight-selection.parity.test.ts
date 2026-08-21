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
  type Segment,
} from "./highlight-selection";

/**
 * 기준 7·9·13·14: 서버 추천 파생·초기 선택·선택 전이(상호 배타)·핸들 clamp가
 * 웹 MSG-329 원본과 동등하다. 웹 원본은 변수 경로 동적 import
 * (upload-wizard.parity.test.ts 주석 — 정적 import는 typecheck를 깬다).
 */
interface WebHighlightSelectionModule {
  SEGMENT_MIN_SEC: number;
  SEGMENT_MAX_SEC: number;
  fromServerHighlights: typeof fromServerHighlights;
  adjustStartHandle: typeof adjustStartHandle;
  adjustEndHandle: typeof adjustEndHandle;
  clampSegment: typeof clampSegment;
  moveSegment: typeof moveSegment;
  createInitialSelection: typeof createInitialSelection;
  selectAi: typeof selectAi;
  selectManual: typeof selectManual;
  getSelectedSegment: typeof getSelectedSegment;
  formatTimecode: typeof formatTimecode;
  formatSegmentLabel: typeof formatSegmentLabel;
}
const WEB_HIGHLIGHT_SELECTION_PATH = new URL(
  "../../../../../web/src/features/upload/model/highlight-selection.ts",
  import.meta.url,
).pathname;
const loadWebHighlightSelection = (): Promise<WebHighlightSelectionModule> =>
  import(WEB_HIGHLIGHT_SELECTION_PATH);

const DURATION = 42;

/** 정상·비정상 형상을 섞은 서버 응답 픽스처 */
const PAIR_FIXTURES: (number[][] | null | undefined)[] = [
  [
    [3, 8],
    [14, 19],
    [21, 26],
  ],
  // 원소 부족·역전·비수치 — 전부 걸러진다
  [[3], [19, 14], [Number.NaN, 8], [3, 8]],
  // 상한 초과·범위 밖 — 5~28초·[0, duration]으로 정규화된다
  [
    [0, 120],
    [-5, -2],
  ],
  [],
  null,
  undefined,
];

const SEGMENT_FIXTURES: Segment[] = [
  { start: 0, end: 5 },
  { start: 3, end: 8 },
  { start: 10, end: 38 },
  { start: 40, end: 42 },
];
const HANDLE_TARGETS = [-10, 0, 1, 5, 12, 30, 41, 60];

describe("fromServerHighlights — 서버 추천 파생 (기준 7)", () => {
  it("배열 순서(추천 우선순위)를 보존한다 (기준 7)", () => {
    const list = fromServerHighlights(
      [
        [3, 8],
        [14, 19],
      ],
      DURATION,
    );

    expect(list.map((s) => s.start)).toEqual([3, 14]);
    expect(list.map((s) => s.id)).toEqual(["ai-1", "ai-2"]);
  });

  it("원소 부족·역전·비수치 쌍을 걸러낸다 (기준 7)", () => {
    const list = fromServerHighlights(
      [[3], [19, 14], [Number.NaN, 8], [3, 8]],
      DURATION,
    );

    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ start: 3, end: 8 });
  });

  it("각 구간을 5~28초·[0, duration]으로 정규화한다 (기준 7)", () => {
    const [whole, negative] = fromServerHighlights(
      [
        [0, 120],
        [-5, -2],
      ],
      DURATION,
    );

    expect(whole.end - whole.start).toBe(SEGMENT_MAX_SEC);
    expect(negative.start).toBeGreaterThanOrEqual(0);
    expect(negative.end - negative.start).toBe(SEGMENT_MIN_SEC);
  });

  it("null·undefined·빈 배열은 빈 목록이다 (기준 7)", () => {
    expect(fromServerHighlights(null, DURATION)).toEqual([]);
    expect(fromServerHighlights(undefined, DURATION)).toEqual([]);
    expect(fromServerHighlights([], DURATION)).toEqual([]);
  });
});

describe("createInitialSelection — 진입 시 기본 선택 (기준 9)", () => {
  it("추천이 있으면 mode:'ai' + 첫 번째 추천이 선택된 상태로 연다 (기준 9·10)", () => {
    const suggestions = fromServerHighlights(
      [
        [3, 8],
        [14, 19],
      ],
      DURATION,
    );

    const state = createInitialSelection(DURATION, suggestions);

    expect(state.mode).toBe("ai");
    expect(state.selectedAi).toBe(suggestions[0]);
  });

  it("추천이 0개면 mode:'manual'로 진입한다 — 3502 직접 지정 폴백 (기준 9·32)", () => {
    const state = createInitialSelection(DURATION, []);

    expect(state.mode).toBe("manual");
    expect(state.selectedAi).toBeNull();
  });
});

describe("selectAi·selectManual — 상호 배타 전이 (기준 13)", () => {
  it("추천 행을 고르면 mode:'ai'로 전이한다 (기준 13)", () => {
    const suggestions = fromServerHighlights(
      [
        [3, 8],
        [14, 19],
      ],
      DURATION,
    );
    const initial = createInitialSelection(DURATION, suggestions);

    const next = selectAi(initial, suggestions[1]);

    expect(next.mode).toBe("ai");
    expect(next.selectedAi).toBe(suggestions[1]);
  });

  it("슬라이더를 조작하면 mode:'manual' + selectedAi:null로 전이한다 (기준 13)", () => {
    const suggestions = fromServerHighlights([[3, 8]], DURATION);
    const initial = createInitialSelection(DURATION, suggestions);

    const next = selectManual(initial, { start: 10, end: 20 });

    expect(next.mode).toBe("manual");
    expect(next.selectedAi).toBeNull();
    expect(getSelectedSegment(next)).toEqual({ start: 10, end: 20 });
  });
});

describe("adjustStartHandle·adjustEndHandle — 핸들 드래그 clamp (기준 14)", () => {
  it("시작 핸들은 길이를 5초 미만·28초 초과로 만들지 않는다 (기준 14)", () => {
    const segment: Segment = { start: 10, end: 20 };

    expect(adjustStartHandle(segment, 19).start).toBe(15);
    expect(adjustStartHandle(segment, -100).start).toBe(0);
    expect(adjustStartHandle({ start: 10, end: 40 }, 0).start).toBe(12);
  });

  // 5초 미만 원본은 select-validation이 일부러 통과시키는 정상 경로다(길이 하한 없음).
  // 이때 초기 구간이 {0, duration}이라 끝-5초가 음수가 되는데, min>max 역전으로 clamp가
  // 그 음수를 돌려주면 start가 음수로 새어 서버 트리밍 요청까지 간다 (PR #84 리뷰).
  it("영상이 5초보다 짧아도 시작 핸들이 음수로 가지 않는다", () => {
    expect(adjustStartHandle({ start: 0, end: 3 }, 2).start).toBe(0);
    expect(adjustStartHandle({ start: 0, end: 3 }, -1).start).toBe(0);
    expect(adjustStartHandle({ start: 0, end: 0.5 }, 0.4).start).toBe(0);
  });

  it("끝 핸들은 [0, duration]과 5~28초 길이를 벗어나지 않는다 (기준 14)", () => {
    const segment: Segment = { start: 10, end: 20 };

    expect(adjustEndHandle(segment, 11, DURATION).end).toBe(15);
    expect(adjustEndHandle(segment, 100, DURATION).end).toBe(38);
    expect(adjustEndHandle({ start: 30, end: 36 }, 100, DURATION).end).toBe(42);
  });
});

describe("formatSegmentLabel — 선택 구간 요약 문구 (기준 15)", () => {
  it("'0:03 – 0:08 · 5초' 형식으로 만든다 (기준 15·19)", () => {
    expect(formatSegmentLabel({ start: 3, end: 8 })).toBe("0:03 – 0:08 · 5초");
    expect(formatSegmentLabel({ start: 75, end: 95 })).toBe(
      "1:15 – 1:35 · 20초",
    );
  });
});

describe("웹 원본 동등성 (기준 44)", () => {
  it("상한·하한 상수가 웹과 같다 (5초·28초)", async () => {
    const web = await loadWebHighlightSelection();

    expect(SEGMENT_MIN_SEC).toBe(web.SEGMENT_MIN_SEC);
    expect(SEGMENT_MAX_SEC).toBe(web.SEGMENT_MAX_SEC);
  });

  it("서버 응답 픽스처 전 조합에서 웹 fromServerHighlights·createInitialSelection과 결과가 같다 (기준 7·9)", async () => {
    const web = await loadWebHighlightSelection();

    for (const pairs of PAIR_FIXTURES) {
      const mobileList = fromServerHighlights(pairs, DURATION);
      expect(mobileList).toEqual(web.fromServerHighlights(pairs, DURATION));
      expect(createInitialSelection(DURATION, mobileList)).toEqual(
        web.createInitialSelection(DURATION, mobileList),
      );
    }
  });

  it("구간 × 목표값 전 조합에서 웹 핸들 clamp·이동·정규화와 결과가 같다 (기준 14)", async () => {
    const web = await loadWebHighlightSelection();

    for (const segment of SEGMENT_FIXTURES) {
      expect(clampSegment(segment, DURATION)).toEqual(
        web.clampSegment(segment, DURATION),
      );
      for (const target of HANDLE_TARGETS) {
        expect(adjustStartHandle(segment, target)).toEqual(
          web.adjustStartHandle(segment, target),
        );
        expect(adjustEndHandle(segment, target, DURATION)).toEqual(
          web.adjustEndHandle(segment, target, DURATION),
        );
        expect(moveSegment(segment, target, DURATION)).toEqual(
          web.moveSegment(segment, target, DURATION),
        );
      }
      expect(formatSegmentLabel(segment)).toBe(web.formatSegmentLabel(segment));
      expect(formatTimecode(segment.start)).toBe(
        web.formatTimecode(segment.start),
      );
    }
  });
});
