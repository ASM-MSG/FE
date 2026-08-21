import { useRef, useState } from "react";
import { ModalCard } from "@fillmap/ui-web";
import {
  formatSegmentLabel,
  getSelectedSegment,
  type HighlightSuggestion,
  type Segment,
} from "@/features/upload/model/highlight-selection";
import { useHighlightSelection } from "@/features/upload/model/use-highlight-selection";
import { SegmentList } from "./SegmentList";
import { SegmentTrimmer } from "./SegmentTrimmer";
import { VideoPreview, type VideoPreviewHandle } from "./VideoPreview";

interface HighlightStepProps {
  /** 원본 로컬 objectURL — 카드 선택 시 해당 구간 미리 재생 소스 (B7) */
  objectUrl: string | null;
  /** 실측 영상 길이(초) */
  duration: number;
  /** 서버 선분석 추천 (1~3개, 배열 순서 = 우선순위) — 폴백 진입이면 빈 배열 (B6) */
  suggestions: HighlightSuggestion[];
  /** 3502 폴백 — 추천 없이 직접 구간 지정 모드 + 재분석 안내 (B5) */
  manualFallback: boolean;
  /** 폴백에서 재분석 시도 — 성공 단계는 건너뛴다 (B11) */
  onRetryAnalysis: () => void;
  /** 선택 구간 확정 → 미리보기(트리밍)로 (B8) */
  onNext: (segment: Segment) => void;
  /** 모달 전체 닫기 (✕) */
  onClose: () => void;
}

/**
 * 2/3 "AI 하이라이트 추천" 화면 본체 (MSG-329 B6·B7).
 * 서버 추천 카드(시간 정보 중심, 첫 번째 기본 선택) + 직접 구간 트리머(5~28초)를
 * ModalCard 안에 조립한다. 카드 선택 시 해당 구간이 로컬 파일로 미리 재생된다.
 * 3502 폴백이면 추천 없이 직접 지정 모드로 진입하고 재분석을 안내한다 (B5).
 */
export const HighlightStep = ({
  objectUrl,
  duration,
  suggestions,
  manualFallback,
  onRetryAnalysis,
  onNext,
  onClose,
}: HighlightStepProps) => {
  const { state, chooseAi, chooseManual } = useHighlightSelection(
    duration,
    suggestions,
  );
  const previewRef = useRef<VideoPreviewHandle>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);

  const selectedSegment = getSelectedSegment(state);
  const selectedAiId = state.mode === "ai" ? state.selectedAi.id : null;

  // 카드 선택 = 선택 + 구간 미리 재생 (B7)
  const handleSelectSuggestion = (suggestion: HighlightSuggestion) => {
    chooseAi(suggestion);
    previewRef.current?.playSegment({
      start: suggestion.start,
      end: suggestion.end,
    });
  };

  return (
    <ModalCard
      title="AI 하이라이트 추천"
      description={
        manualFallback
          ? "직접 구간을 지정해 주세요 · 2/3 단계"
          : "AI가 추천한 최적 구간을 확인하고 선택하세요 · 2/3 단계"
      }
      confirmText="이 구간으로 다음 단계"
      onConfirm={() => onNext(selectedSegment)}
      onClose={onClose}
    >
      <VideoPreview
        ref={previewRef}
        objectUrl={objectUrl}
        onTimeUpdate={setPlayhead}
      />

      {manualFallback ? (
        // 3502 폴백 — 분석 실패 안내 + 재시도 (B5)
        <div className="flex w-full items-center justify-between gap-sm rounded-md bg-surface-soft px-md py-sm">
          <span className="min-w-0 text-fm-label text-foreground-muted">
            AI 분석에 실패했어요. 직접 구간을 지정하거나 다시 시도할 수 있어요
          </span>
          <button
            type="button"
            onClick={onRetryAnalysis}
            className="shrink-0 text-fm-label font-semibold text-primary"
          >
            다시 분석
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-xs">
          <span className="text-fm-body-strong text-foreground">
            AI 추천 구간
          </span>
          <SegmentList
            suggestions={suggestions}
            selectedId={selectedAiId}
            onSelect={handleSelectSuggestion}
          />
        </div>
      )}

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
          {formatSegmentLabel(selectedSegment)}
        </span>
      </div>
    </ModalCard>
  );
};
