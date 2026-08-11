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
 * duration·추천 목록이 바뀌면(다른 영상/재분석) 렌더 중 선택을 초기화한다 —
 * effect가 아닌 "이전 값 비교" 패턴. 추천 목록은 참조 동일성 비교라 호출부가
 * 상태/메모로 고정해 전달해야 한다 (UploadModal은 state로 보유).
 */
export const useHighlightSelection = (
  duration: number,
  suggestions: HighlightSuggestion[],
) => {
  const [state, setState] = useState<HighlightSelectionState>(() =>
    createInitialSelection(duration, suggestions),
  );
  const [prev, setPrev] = useState({ duration, suggestions });

  if (duration !== prev.duration || suggestions !== prev.suggestions) {
    setPrev({ duration, suggestions });
    setState(createInitialSelection(duration, suggestions));
  }

  /** AI 추천 구간을 선택한다(직접 지정 해제). */
  const chooseAi = useCallback((suggestion: HighlightSuggestion) => {
    setState((current) => selectAi(current, suggestion));
  }, []);

  /** 직접 구간을 지정/갱신한다(AI 추천 해제). */
  const chooseManual = useCallback((segment: Segment) => {
    setState((current) => selectManual(current, segment));
  }, []);

  return { state, chooseAi, chooseManual };
};
