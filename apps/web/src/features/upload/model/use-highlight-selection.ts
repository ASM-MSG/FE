import { useCallback, useState } from "react";
import {
  createInitialSelection,
  type HighlightSelectionState,
  type HighlightSuggestion,
  type Segment,
  selectAi,
  selectManual,
} from "./highlight-selection";

/**
 * 하이라이트 선택 상태 훅 — 순수 reducer(highlight-selection)를 감싼다.
 * 플랫폼 API를 참조하지 않아 RN 재사용 대상(useState만 사용).
 * duration이 바뀌면(다른 영상) 렌더 중 선택을 초기화한다 — effect가 아닌 "이전 값 비교" 패턴.
 */
export const useHighlightSelection = (duration: number) => {
  const [state, setState] = useState<HighlightSelectionState>(() =>
    createInitialSelection(duration),
  );
  const [prevDuration, setPrevDuration] = useState(duration);

  if (duration !== prevDuration) {
    setPrevDuration(duration);
    setState(createInitialSelection(duration));
  }

  /** AI 추천 구간을 선택한다(직접 지정 해제). */
  const chooseAi = useCallback((suggestion: HighlightSuggestion) => {
    setState((prev) => selectAi(prev, suggestion));
  }, []);

  /** 직접 구간을 지정/갱신한다(AI 추천 해제). */
  const chooseManual = useCallback((segment: Segment) => {
    setState((prev) => selectManual(prev, segment));
  }, []);

  return { state, chooseAi, chooseManual };
};
