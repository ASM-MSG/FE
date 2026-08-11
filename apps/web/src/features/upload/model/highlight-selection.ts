/**
 * AI 하이라이트 추천 — 선택/트리머 순수 로직 (MSG-118 → MSG-329 재설계).
 * 플랫폼 API(window·File·DOM·video 등)를 참조하지 않는다 — 초 단위 숫자만 다루므로 RN 재사용 대상.
 * 추천은 목 생성이 아니라 서버 선분석(highlight-preview) 응답 [[시작,끝]]에서 파생하고(B6),
 * 사유 라벨은 없다(응답이 시간쌍뿐 — Figma 사유 문구는 플레이스홀더, 티켓 13 확정).
 */

/** 직접 구간 최소 길이 — 5초. [B7] */
export const SEGMENT_MIN_SEC = 5;
/**
 * 직접 구간 최대 길이 — 28초. [B7]
 * 구 30초 상한 폐기 — 스트림 카피 키프레임 밀림 대비 durationSec≤30 여유 (티켓 13 확정).
 */
export const SEGMENT_MAX_SEC = 28;

/** 시간 구간 — 시작·끝(초). */
export interface Segment {
  start: number;
  end: number;
}

/** AI 추천 구간 — 서버 시간쌍 + 카드 선택 식별자. */
export interface HighlightSuggestion extends Segment {
  id: string;
}

/** 선택 방식 — AI 추천 vs 직접 지정. */
export type SelectionMode = "ai" | "manual";

/**
 * 선택 상태 — mode가 단일 선택을 강제한다(상호 배타).
 * "ai"는 항상 selectedAi와 함께만 성립한다(불가능 상태 배제) — 미선택 상태는 없다:
 * 추천이 있으면 첫 번째가 기본 선택(B6), 없으면 수동 구간이 선택이다(B5 폴백).
 */
export type HighlightSelectionState =
  | { mode: "ai"; selectedAi: HighlightSuggestion; manualSegment: Segment }
  | { mode: "manual"; selectedAi: null; manualSegment: Segment };

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * 서버 선분석 응답 [[시작초, 끝초], ...]을 추천 목록으로 변환한다. [B6]
 * 배열 순서(=추천 우선순위)를 보존하고, 시간쌍이 아닌 형상(원소 부족·역전·비수치)은 걸러낸다.
 */
export const fromServerHighlights = (
  pairs: number[][] | null | undefined,
): HighlightSuggestion[] =>
  (pairs ?? [])
    .filter(
      (pair): pair is [number, number] =>
        pair.length >= 2 &&
        Number.isFinite(pair[0]) &&
        Number.isFinite(pair[1]) &&
        pair[1] > pair[0],
    )
    .map(([start, end], index) => ({ id: `ai-${index + 1}`, start, end }));

/**
 * 시작 핸들을 newStart로 옮길 때의 clamp 결과. 끝은 고정. [B7]
 * - 끝-5초보다 뒤로 못 감(최소 길이), 끝-28초보다 앞으로 못 감(최대 길이), 0 미만 불가(경계).
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
 * 끝 핸들을 newEnd로 옮길 때의 clamp 결과. 시작은 고정. [B7]
 * - 시작+5초보다 앞으로 못 감(최소 길이), 시작+28초보다 뒤로 못 감(최대 길이), duration 초과 불가(경계).
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

/** 임의 구간을 5~28초 길이·[0, duration] 범위로 정규화한다. [B7] */
export const clampSegment = (segment: Segment, duration: number): Segment => {
  const length = Math.min(
    clamp(segment.end - segment.start, SEGMENT_MIN_SEC, SEGMENT_MAX_SEC),
    duration,
  );
  const start = clamp(segment.start, 0, duration - length);
  return { start, end: start + length };
};

/** 밴드 본체 드래그 — 길이를 유지한 채 구간을 delta만큼 이동하고 경계에서 정지한다. */
export const moveSegment = (
  segment: Segment,
  delta: number,
  duration: number,
): Segment => {
  const length = segment.end - segment.start;
  const start = clamp(segment.start + delta, 0, duration - length);
  return { start, end: start + length };
};

/** 트리머 초기 구간 — 진입 시 표시용 기본 밴드. */
const initialManualSegment = (duration: number): Segment =>
  clampSegment(
    { start: duration * 0.2, end: duration * 0.2 + SEGMENT_MAX_SEC },
    duration,
  );

/**
 * 초기 선택 상태 — 추천이 있으면 첫 번째(배열 순서 = 우선순위)가 기본 선택(B6),
 * 없으면(3502 직접 지정 폴백 등) 수동 모드로 진입한다(B5).
 */
export const createInitialSelection = (
  duration: number,
  suggestions: HighlightSuggestion[],
): HighlightSelectionState =>
  suggestions.length > 0
    ? {
        mode: "ai",
        selectedAi: suggestions[0],
        manualSegment: initialManualSegment(duration),
      }
    : {
        mode: "manual",
        selectedAi: null,
        manualSegment: initialManualSegment(duration),
      };

/** AI 추천 구간을 선택한다 — 직접 지정 선택을 해제한다(상호 배타). */
export const selectAi = (
  state: HighlightSelectionState,
  suggestion: HighlightSuggestion,
): HighlightSelectionState => ({
  mode: "ai",
  selectedAi: suggestion,
  manualSegment: state.manualSegment,
});

/** 직접 구간을 지정/갱신한다 — AI 추천 선택을 해제한다(상호 배타). */
export const selectManual = (
  _state: HighlightSelectionState,
  segment: Segment,
): HighlightSelectionState => ({
  mode: "manual",
  selectedAi: null,
  manualSegment: segment,
});

/** 현재 선택된 구간 — 미선택 상태가 없으므로 항상 존재한다. */
export const getSelectedSegment = (state: HighlightSelectionState): Segment =>
  state.mode === "ai"
    ? { start: state.selectedAi.start, end: state.selectedAi.end }
    : { start: state.manualSegment.start, end: state.manualSegment.end };

/** 초를 m:ss 형식으로 포맷한다 (예: 3 → "0:03", 75 → "1:15"). */
export const formatTimecode = (seconds: number): string => {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
};

/**
 * 구간의 시간 정보 중심 라벨 — "0:03 – 0:08 · 5초". [B6]
 * 추천 카드·선택 요약·미리보기 구간 카드가 공유한다(사유 라벨 없음, 티켓 13 확정).
 */
export const formatSegmentLabel = (segment: Segment): string =>
  `${formatTimecode(segment.start)} – ${formatTimecode(segment.end)} · ${Math.round(
    segment.end - segment.start,
  )}초`;
