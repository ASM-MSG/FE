import { useMemo, useRef, useState } from "react";
import { ModalCard } from "@fillmap/ui-web";
import {
  buildMockHighlights,
  canProceedToNextStep,
  formatTimecode,
  getSelectedSegment,
  type HighlightSuggestion,
  type Segment,
  type SelectionResult,
  toSelectionResult,
} from "@/features/upload/model/highlight-selection";
import { useHighlightSelection } from "@/features/upload/model/use-highlight-selection";
import { SegmentList } from "./SegmentList";
import { SegmentTrimmer } from "./SegmentTrimmer";
import { VideoPreview, type VideoPreviewHandle } from "./VideoPreview";

interface HighlightStepProps {
  /** 미리보기 objectURL (실제 재생 소스) */
  objectUrl: string | null;
  /** 실측 영상 길이(초) */
  duration: number;
  /** 모달 전체 닫기 (✕) */
  onClose: () => void;
  /** 다음 단계(블러 확인)로 전환 — 선택 결과(SelectionResult|null)를 상위로 전달 (MSG-120 S11, MSG-118 배선 완성) */
  onNext: (result: SelectionResult | null) => void;
}

const STEP_DESCRIPTION =
  "AI가 추천한 최적 구간을 확인하고 선택하세요 · 2/4 단계";

/**
 * 2단계 "AI 하이라이트 추천" 화면 본체. [S2~S11]
 * 미리보기 + AI 추천 리스트(목업) + 직접 구간 트리머 + 선택 요약을 ModalCard 안에 조립한다.
 * 선택 상태·트리머 드래그는 모달 로컬(useHighlightSelection) — 전역 스토어에 추가하지 않는다.
 * "이 구간으로 다음 단계"를 누르면 블러 확인(3/4) 스텝으로 전환하며(MSG-119 S6),
 * 선택 결과(toSelectionResult)를 상위로 전달해 4/4 미리보기가 사용한다(MSG-120 S11).
 */
export const HighlightStep = ({
  objectUrl,
  duration,
  onClose,
  onNext,
}: HighlightStepProps) => {
  const suggestions = useMemo(() => buildMockHighlights(duration), [duration]);
  const { state, chooseAi, chooseManual } = useHighlightSelection(duration);
  const previewRef = useRef<VideoPreviewHandle>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);

  const selectedSegment = getSelectedSegment(state);
  const selectedAiId =
    state.mode === "ai" ? (state.selectedAi?.id ?? null) : null;

  const playSegment = (segment: Segment) => {
    previewRef.current?.playSegment(segment);
  };

  const handlePlaySuggestion = (suggestion: HighlightSuggestion) => {
    playSegment({ start: suggestion.start, end: suggestion.end });
  };

  // "이 구간으로 다음 단계" → 블러 확인(3/4)으로 전환 (MSG-119 S6, MSG-118 콘솔 로그 대체).
  // 선택 결과(SelectionResult|null)를 상위로 전달 — 4/4 미리보기 하이라이트 카드가 사용한다 (MSG-120 S11).
  const handleConfirm = () => {
    onNext(toSelectionResult(state));
  };

  return (
    <ModalCard
      title="AI 하이라이트 추천"
      description={STEP_DESCRIPTION}
      confirmText="이 구간으로 다음 단계"
      confirmDisabled={!canProceedToNextStep(state)}
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      <VideoPreview
        ref={previewRef}
        objectUrl={objectUrl}
        onTimeUpdate={setPlayhead}
      />

      <div className="flex w-full flex-col gap-xs">
        <span className="text-fm-body-strong text-foreground">
          AI 추천 구간
        </span>
        <SegmentList
          suggestions={suggestions}
          selectedId={selectedAiId}
          onSelect={chooseAi}
          onPlay={handlePlaySuggestion}
        />
      </div>

      <div className="flex w-full flex-col gap-xs">
        <span className="text-fm-body-strong text-foreground">
          직접 구간 지정
        </span>
        <SegmentTrimmer
          duration={duration}
          segment={state.manualSegment}
          selected={state.mode === "manual"}
          playhead={playhead}
          onChange={chooseManual}
        />
      </div>

      <div className="flex w-full items-center justify-between rounded-md bg-surface-soft px-md py-sm">
        <span className="text-fm-label text-foreground-muted">선택한 구간</span>
        <span className="text-fm-body-strong text-foreground">
          {selectedSegment
            ? `${formatTimecode(selectedSegment.start)} – ${formatTimecode(
                selectedSegment.end,
              )} · ${Math.round(selectedSegment.end - selectedSegment.start)}초`
            : "구간을 선택하세요"}
        </span>
      </div>
    </ModalCard>
  );
};
