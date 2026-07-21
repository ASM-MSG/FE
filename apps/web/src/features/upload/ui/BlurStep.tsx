import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { ModalCard } from "@fillmap/ui-web";
import {
  type BlurConfirmResult,
  buildMockBlurRegions,
  formatBlurCompletion,
  summarizeBlurRegions,
  toBlurConfirmResult,
} from "@/features/upload/model/blur-detection";
import { formatTimecode } from "@/features/upload/model/highlight-selection";
import { BlurOverlay } from "./BlurOverlay";
import { VideoPreview } from "./VideoPreview";

interface BlurStepProps {
  /** 미리보기 objectURL (실제 표시 소스) */
  objectUrl: string | null;
  /** 실측 영상 길이(초) — 타임코드·확인 payload용 */
  duration: number;
  /** 모달 전체 닫기 (✕) */
  onClose: () => void;
  /** 확인 결과 payload 통보 — 임시 완료 지점(콘솔 로그) */
  onConfirm: (result: BlurConfirmResult) => void;
}

const STEP_DESCRIPTION = "얼굴과 번호판을 자동으로 감지해 가렸어요 · 3/4 단계";

/**
 * 3단계 "AI 자동 블러 확인" 화면 본체. [S8~S14]
 * 미리보기(영상 + 감지 오버레이 + 타임코드) + 완료 상태 바를 ModalCard 안에 조립한다.
 * view-only — 편집 컨트롤이 없고(S12), 재생/seek 없이 정지 표시한다(Q5).
 * 감지 데이터·완료 문구는 목업(순수 로직)에서 생성한다.
 */
export const BlurStep = ({
  objectUrl,
  duration,
  onClose,
  onConfirm,
}: BlurStepProps) => {
  const regions = useMemo(() => buildMockBlurRegions(), []);
  const summary = useMemo(() => summarizeBlurRegions(regions), [regions]);
  const completion = formatBlurCompletion(summary);

  const handleConfirm = () => {
    // 4/4 최종 화면은 다음 티켓 — 확인 결과 payload를 상위(콘솔 로그)로 넘긴다 (S13·L7)
    onConfirm(toBlurConfirmResult(summary, duration));
  };

  return (
    <ModalCard
      title="AI 자동 블러 확인"
      description={STEP_DESCRIPTION}
      confirmText="확인 후 다음 단계"
      confirmVariant="primary"
      onConfirm={handleConfirm}
      onClose={onClose}
    >
      <VideoPreview
        objectUrl={objectUrl}
        overlay={
          <>
            <BlurOverlay regions={regions} />
            {/* 실측 duration을 타임코드로 표시 (Q6·S10) — 우하단 */}
            <span className="absolute bottom-xs right-xs rounded-sm bg-foreground/80 px-xs py-xxs text-fm-caption text-foreground-inverse">
              {formatTimecode(duration)}
            </span>
          </>
        }
      />

      {/* 완료 상태 바 — 어두운 강조 (InfoBox tone="dark" 준용) [S11] */}
      <div className="flex w-full items-center gap-xs rounded-md bg-foreground px-md py-sm">
        <ShieldCheck className="size-4 shrink-0 text-foreground-inverse" />
        <span className="text-fm-body-strong text-foreground-inverse">
          {completion}
        </span>
      </div>
    </ModalCard>
  );
};
