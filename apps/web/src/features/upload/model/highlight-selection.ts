/**
 * AI 하이라이트 추천 — 선택/트리머 순수 로직 (MSG-118 L1~L9).
 * 플랫폼 API(window·File·DOM·video 등)를 참조하지 않는다 — 초 단위 숫자만 다루므로 RN 재사용 대상.
 * 실제 영상 duration 캡처·재생은 UI 경계(use-video-duration / VideoPreview)에 격리한다.
 */

/** 직접 구간 최소 길이 — 5초. [L2] */
export const SEGMENT_MIN_SEC = 5;
/** 직접 구간 최대 길이 — 30초. [L3] */
export const SEGMENT_MAX_SEC = 30;

/** 시간 구간 — 시작·끝(초). */
export interface Segment {
  start: number;
  end: number;
}

/** AI 추천 구간 — 구간 + 식별자 + 추천 사유. */
export interface HighlightSuggestion extends Segment {
  id: string;
  reason: string;
}

/** 선택 방식 — AI 추천 vs 직접 지정. */
export type SelectionMode = "ai" | "manual";

/**
 * 선택 상태 — mode가 단일 선택을 강제한다(상호 배타). [L5]
 * manualSegment는 트리머의 현재 구간 값으로 항상 유효 값을 보유하며,
 * mode==="manual"일 때만 "선택된 구간"으로 취급된다.
 */
export interface HighlightSelectionState {
  /** 현재 선택 방식 — null이면 미선택 */
  mode: SelectionMode | null;
  /** AI 방식으로 선택된 추천 구간 — 미선택이면 null */
  selectedAi: HighlightSuggestion | null;
  /** 트리머의 현재 구간 값 (드래그로 갱신) */
  manualSegment: Segment;
}

/** 콘솔 로그 payload. [L9] */
export interface SelectionResult {
  start: number;
  end: number;
  mode: SelectionMode;
}

/** AI 추천 사유 시드 (Figma 5개 구간 사유). */
const HIGHLIGHT_REASONS = [
  "움직임·밝기 지속",
  "장면 변화 풍부",
  "조회수 예측 상위",
  "색감·구도 안정형",
  "동작 다이나믹",
] as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * AI 하이라이트 추천을 제공할지 판정한다. 영상 길이가 5초를 초과할 때만 true. [L1]
 * 정확히 5초 및 그 이하이면 false (최소 구간 길이를 확보할 수 없음).
 */
export const shouldOfferHighlight = (duration: number): boolean =>
  duration > SEGMENT_MIN_SEC;

/**
 * 시작 핸들을 newStart로 옮길 때의 clamp 결과. 끝은 고정. [L2·L3·L4]
 * - 끝-5초보다 뒤로 못 감(최소 길이), 끝-30초보다 앞으로 못 감(최대 길이), 0 미만 불가(경계).
 * (하한이 0이므로 duration 상한은 시작 핸들에 불필요 — 끝 핸들만 duration을 받는다.)
 */
export const adjustStartHandle = (
  segment: Segment,
  newStart: number,
): Segment => {
  const min = Math.max(0, segment.end - SEGMENT_MAX_SEC);
  const max = segment.end - SEGMENT_MIN_SEC;
  return { start: clamp(newStart, min, max), end: segment.end };
};

/**
 * 끝 핸들을 newEnd로 옮길 때의 clamp 결과. 시작은 고정. [L2·L3·L4]
 * - 시작+5초보다 앞으로 못 감(최소 길이), 시작+30초보다 뒤로 못 감(최대 길이), duration 초과 불가(경계).
 */
export const adjustEndHandle = (
  segment: Segment,
  newEnd: number,
  duration: number,
): Segment => {
  const min = segment.start + SEGMENT_MIN_SEC;
  const max = Math.min(duration, segment.start + SEGMENT_MAX_SEC);
  return { start: segment.start, end: clamp(newEnd, min, max) };
};

/**
 * 임의 구간을 5~30초 길이·[0, duration] 범위로 정규화한다. [L2·L3·L4·L8]
 * 목업 구간 생성·초기 구간 계산에서 유효성을 보장한다.
 */
export const clampSegment = (segment: Segment, duration: number): Segment => {
  const length = Math.min(
    clamp(segment.end - segment.start, SEGMENT_MIN_SEC, SEGMENT_MAX_SEC),
    duration,
  );
  const start = clamp(segment.start, 0, duration - length);
  return { start, end: start + length };
};

/**
 * 밴드 본체 드래그 — 길이를 유지한 채 구간을 delta만큼 이동하고 경계에서 정지한다. [S7]
 */
export const moveSegment = (
  segment: Segment,
  delta: number,
  duration: number,
): Segment => {
  const length = segment.end - segment.start;
  const start = clamp(segment.start + delta, 0, duration - length);
  return { start, end: start + length };
};

/** 트리머 초기 구간 — 진입 시 표시용 기본 밴드(선택은 아님, 추정 5). */
const initialManualSegment = (duration: number): Segment =>
  clampSegment(
    { start: duration * 0.2, end: duration * 0.2 + SEGMENT_MAX_SEC },
    duration,
  );

/** 초기 선택 상태 — 미선택(mode=null). [L6·추정 5] */
export const createInitialSelection = (
  duration: number,
): HighlightSelectionState => ({
  mode: null,
  selectedAi: null,
  manualSegment: initialManualSegment(duration),
});

/** AI 추천 구간을 선택한다 — 직접 지정 선택을 해제한다(상호 배타). [L5] */
export const selectAi = (
  state: HighlightSelectionState,
  suggestion: HighlightSuggestion,
): HighlightSelectionState => ({
  ...state,
  mode: "ai",
  selectedAi: suggestion,
});

/** 직접 구간을 지정/갱신한다 — AI 추천 선택을 해제한다(상호 배타). [L5] */
export const selectManual = (
  state: HighlightSelectionState,
  segment: Segment,
): HighlightSelectionState => ({
  ...state,
  mode: "manual",
  selectedAi: null,
  manualSegment: segment,
});

/** 현재 선택된 구간 — 미선택이면 null. [L6·L9] */
export const getSelectedSegment = (
  state: HighlightSelectionState,
): Segment | null => {
  if (state.mode === "ai") {
    return state.selectedAi
      ? { start: state.selectedAi.start, end: state.selectedAi.end }
      : null;
  }
  if (state.mode === "manual") {
    return { start: state.manualSegment.start, end: state.manualSegment.end };
  }
  return null;
};

/** 다음 단계로 진행 가능한지 — 구간이 하나라도 선택되면 true. [L6] */
export const canProceedToNextStep = (
  state: HighlightSelectionState,
): boolean => getSelectedSegment(state) !== null;

/** 초를 m:ss 형식으로 포맷한다 (예: 3 → "0:03", 75 → "1:15"). [L7] */
export const formatTimecode = (seconds: number): string => {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
};

/**
 * 목업 AI 추천 구간 3~5개를 생성한다. [L8]
 * 각 구간은 5~30초 길이·[0, duration] 범위를 만족한다(clampSegment로 보장).
 * 개수는 영상 길이에 따라 3(짧음)~5(김)로 가변.
 */
export const buildMockHighlights = (duration: number): HighlightSuggestion[] => {
  const count = Math.max(3, Math.min(5, Math.floor(duration / 10) + 1));
  const desiredLength = clamp(
    Math.round(duration / count),
    SEGMENT_MIN_SEC,
    Math.min(SEGMENT_MAX_SEC, duration),
  );
  // 구간 길이가 고정이므로 시작점이 겹치지 않도록 [0, duration - length]를 균등 분할한다.
  const maxStart = Math.max(0, duration - desiredLength);
  const step = count > 1 ? maxStart / (count - 1) : 0;

  return Array.from({ length: count }, (_, i) => {
    const start = clamp(step * i, 0, maxStart);
    return {
      id: `mock-${i + 1}`,
      reason: HIGHLIGHT_REASONS[i % HIGHLIGHT_REASONS.length],
      start,
      end: start + desiredLength,
    };
  });
};

/** 선택 결과 payload — 콘솔 로그용. 미선택이면 null. [L9] */
export const toSelectionResult = (
  state: HighlightSelectionState,
): SelectionResult | null => {
  const segment = getSelectedSegment(state);
  if (!segment || !state.mode) return null;
  return { start: segment.start, end: segment.end, mode: state.mode };
};
