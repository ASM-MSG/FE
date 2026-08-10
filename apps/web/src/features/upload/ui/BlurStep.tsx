import { ShieldCheck } from "lucide-react";
import { ModalCard } from "@fillmap/ui-web";
import { formatTimecode } from "@/features/upload/model/highlight-selection";
import { VideoPreview } from "./VideoPreview";

interface BlurStepProps {
  /** 미리보기 objectURL (실제 표시 소스) */
  objectUrl: string | null;
  /** 실측 영상 길이(초) — 타임코드 표시용 */
  duration: number;
  /** 모달 전체 닫기 (✕) */
  onClose: () => void;
  /** 이전 단계로 복귀 — 5초 초과면 2/4 하이라이트, 이하면 1/4 (MSG-352 C4) */
  onBack: () => void;
  /** 확인 — 4/4 미리보기로 전환 */
  onConfirm: () => void;
}

const STEP_DESCRIPTION = "영상 전체에 AI 블러 처리를 적용했어요 · 3/4 단계";
const FULL_BLUR_BADGE = "영상 전체에 블러 적용됨";
const COMPLETION_TEXT =
  "AI 자동 블러 완료 — 영상 전체에 블러 처리가 적용됐어요";

/**
 * 3단계 "AI 자동 블러 확인" 화면 본체. [S8~S14 · MSG-352 C7]
 * 미리보기(영상 + 전체 블러 배지 + 타임코드) + 완료 상태 바를 ModalCard 안에 조립한다.
 * Figma ver 10(14324:12148)에서 영역 개수(얼굴 N·번호판 N) 서사가 **영상 전체 블러**
 * 서사로 전환됐다 — 감지 영역 목업(blur-detection)·박스 오버레이(BlurOverlay)는 함께 제거.
 * view-only — 편집 컨트롤이 없고(S12), 재생/seek 없이 정지 표시한다(Q5).
 */
export const BlurStep = ({
  objectUrl,
  duration,
  onClose,
  onBack,
  onConfirm,
}: BlurStepProps) => (
  <ModalCard
    title="AI 자동 블러 확인"
    description={STEP_DESCRIPTION}
    confirmText="확인 후 다음 단계"
    confirmVariant="primary"
    secondaryText="이전 단계로"
    onConfirm={onConfirm}
    onSecondary={onBack}
    onClose={onClose}
  >
    <VideoPreview
      objectUrl={objectUrl}
      overlay={
        <>
          {/* 전체 블러 배지 — 영상 위 중앙 (MSG-352 C7, Figma 14324:12148) */}
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/80 px-md py-xs text-fm-label text-foreground-inverse">
            {FULL_BLUR_BADGE}
          </span>
          {/* 실측 duration을 타임코드로 표시 (Q6·S10) — 우하단 */}
          <span className="absolute bottom-xs right-xs rounded-sm bg-foreground/80 px-xs py-xxs text-fm-caption text-foreground-inverse">
            {formatTimecode(duration)}
          </span>
        </>
      }
    />

    {/* 완료 상태 바 — 어두운 강조 (InfoBox tone="dark" 준용) [S11 · MSG-352 C7] */}
    <div className="flex w-full items-center gap-xs rounded-md bg-foreground px-md py-sm">
      <ShieldCheck className="size-4 shrink-0 text-foreground-inverse" />
      <span className="text-fm-body-strong text-foreground-inverse">
        {COMPLETION_TEXT}
      </span>
    </div>
  </ModalCard>
);
