import { useMemo, useRef, useState } from "react";
import { ModalCard } from "@fillmap/ui-web";
import {
  buildMockHighlights,
  canProceedToNextStep,
  formatTimecode,
  getSelectedSegment,
  type HighlightSuggestion,
  type Segment,
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
}

const STEP_DESCRIPTION =
  "AI가 추천한 최적 구간을 확인하고 선택하세요 · 2/4 단계";

/**
 * 2단계 "AI 하이라이트 추천" 화면 본체. [S2~S11]
 * 미리보기 + AI 추천 리스트(목업) + 직접 구간 트리머 + 선택 요약을 ModalCard 안에 조립한다.
 * 선택 상태·트리머 드래그는 모달 로컬(useHighlightSelection) — 전역 스토어에 추가하지 않는다.
 * "다음 단계"는 선택 결과를 콘솔에 로그할 뿐 실제 화면 이동은 없다(범위 밖).
 */
export const HighlightStep = ({
  objectUrl,
  duration,
  onClose,
}: HighlightStepProps) => {
  const suggestions = useMemo(
    () => buildMockHighlights(duration),
    [duration],
  );
  const { state, chooseAi, chooseManual } = useHighlightSelection(duration);
  const previewRef = useRef<VideoPreviewHandle>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);

  const selectedSegment = getSelectedSegment(state);
  const selectedAiId = state.mode === "ai" ? state.selectedAi?.id ?? null : null;

  const playSegment = (segment: Segment) => {
    previewRef.current?.playSegment(segment);
  };

  const handlePlaySuggestion = (suggestion: HighlightSuggestion) => {
    playSegment({ start: suggestion.start, end: suggestion.end });
  };

  const handleConfirm = () => {
    const result = toSelectionResult(state);
    if (result) {
      // 실제 AI 분석·다음 화면 전환은 범위 밖 — 선택 결과 로그가 임시 완료 지점 (S11·L9)
      console.log("[MSG-118] 선택 구간", result);
    }
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
        <span className="text-fm-body-strong text-foreground">AI 추천 구간</span>
        <SegmentList
          suggestions={suggestions}
          selectedId={selectedAiId}
          onSelect={chooseAi}
          onPlay={handlePlaySuggestion}
        />
      </div>

      <div className="flex w-full flex-col gap-xs">
        <span className="text-fm-body-strong text-foreground">직접 구간 지정</span>
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
