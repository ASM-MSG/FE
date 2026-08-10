import { MapPin } from "lucide-react";
import { ModalCard } from "@fillmap/ui-web";
import {
  formatSelectionRange,
  type SelectionResult,
} from "@/features/upload/model/highlight-selection";
import { VideoPreview } from "./VideoPreview";

interface PreviewStepProps {
  /** 미리보기 objectURL (실제 표시 소스) */
  objectUrl: string | null;
  /** 2단계 하이라이트 선택 결과 — null이면 하이라이트 카드를 렌더하지 않는다(5초 이하 건너뜀) */
  highlightSelection: SelectionResult | null;
  /** 위치 카드 라벨 — 1단계에서 태그된 격자(A-14)에서 파생 (Q3) */
  locationLabel: string;
  /** 지금 게시하기(=위저드 닫기, 게시 API는 목업) */
  onPublish: () => void;
  /** 이전 단계(블러 확인 3/4)로 돌아가기 */
  onBack: () => void;
  /** 모달 전체 닫기 (✕) */
  onClose: () => void;
}

const STEP_DESCRIPTION = "4/4 단계 · 최종 확인";
// 하이라이트 카드 선택 근거 — Figma 정적 문구 (Q2, AI reason 리프팅 대신 고정 표시)
const HIGHLIGHT_REASON = "조회수·움직임 기반 최적 5초 구간이 선택되었습니다";

/**
 * 4단계 "업로드 미리보기" 화면 본체. [S1~S11 · MSG-352 C3·C7]
 * 선택 영상 미리보기 + AI 하이라이트 선택 구간 + 위치 태그를 한 화면에서 최종 확인하고
 * "지금 게시하기"로 게시(목업)한다. ModalCard 쉘 안에 카드를 조립한다.
 * Figma ver 10(14324:12172)에서 개인정보 자동 블러 카드(얼굴/번호판 개수 2열)가 제거됐고,
 * "이전 단계로"는 밑줄 링크에서 전폭 보조 버튼(ModalCard secondaryText)으로 승격됐다.
 * view-only — 미리보기는 재생/컨트롤 없이 정지 표시(Q5), "블러 결과 수동 조정" 버튼은 렌더하지 않는다(S7).
 */
export const PreviewStep = ({
  objectUrl,
  highlightSelection,
  locationLabel,
  onPublish,
  onBack,
  onClose,
}: PreviewStepProps) => {
  return (
    <ModalCard
      title="업로드 미리보기"
      description={STEP_DESCRIPTION}
      confirmText="지금 게시하기"
      confirmVariant="primary"
      secondaryText="이전 단계로"
      onConfirm={onPublish}
      onSecondary={onBack}
      onClose={onClose}
    >
      <VideoPreview objectUrl={objectUrl} />

      {/* 하이라이트 카드 — 선택 결과가 있을 때만(5초 초과 흐름). 어두운 강조 (InfoBox tone="dark" 준용) [S3·S4·S11] */}
      {highlightSelection && (
        <div className="flex w-full flex-col gap-xxs rounded-md bg-foreground px-md py-sm text-left">
          <div className="flex items-center justify-between gap-xs">
            <span className="text-fm-body-strong text-foreground-inverse">
              ✦ AI 하이라이트 구간
            </span>
            <span className="text-fm-body-strong text-foreground-inverse">
              {formatSelectionRange(highlightSelection)}
            </span>
          </div>
          <span className="text-fm-label text-foreground-inverse/70">
            {HIGHLIGHT_REASON}
          </span>
        </div>
      )}

      {/* 위치 카드 — 1단계에서 태그된 격자(A-14) 파생 라벨 [S6] */}
      <div className="flex w-full items-center gap-xs rounded-md bg-surface-soft px-md py-sm">
        <MapPin className="size-4 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-col gap-xxs">
          <span className="text-fm-label text-foreground-muted">위치</span>
          <span className="text-fm-body-strong text-foreground">
            {locationLabel}
          </span>
        </div>
      </div>
    </ModalCard>
  );
};
