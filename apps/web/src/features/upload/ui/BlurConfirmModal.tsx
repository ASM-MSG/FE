import { ShieldCheck } from "lucide-react";
import { DialogShell, ModalCard } from "@fillmap/ui-web";
import { VideoPreview } from "./VideoPreview";

interface BlurConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** READY 폴링에서 받은 재생 URL(블러본) — presign TTL 내 유효 */
  playbackUrl: string | null;
}

/**
 * AI 자동 블러 확인 모달 (MSG-329 B16) — READY 토스트의 [확인하기]로 열려
 * playbackUrl(블러본)을 재생한다. [확인]은 닫기만 한다 — 원본→블러본 교체는 서버 자동.
 * 블러 영역 데이터가 응답에 없어 오버레이 배지는 정적 안내다 (오탐 방지 7 —
 * Figma 부제 "알림에서 확인"은 웹 알림 이력 화면 부재로 토스트 경유 문구로 조정).
 */
export const BlurConfirmModal = ({
  open,
  onOpenChange,
  playbackUrl,
}: BlurConfirmModalProps) => (
  <DialogShell
    open={open}
    onOpenChange={onOpenChange}
    srTitle="AI 자동 블러 확인"
  >
    <ModalCard
      title="AI 자동 블러 확인"
      description="블러 처리가 끝난 영상이에요. 재생해서 확인해보세요"
      confirmText="확인"
      onConfirm={() => onOpenChange(false)}
      onClose={() => onOpenChange(false)}
    >
      {playbackUrl !== null ? (
        <VideoPreview objectUrl={playbackUrl} controls />
      ) : (
        <p className="rounded-md bg-surface-soft px-md py-sm text-fm-body text-foreground-muted">
          재생 주소가 만료됐어요. 잠시 후 지도에서 영상을 확인해주세요
        </p>
      )}

      {/* 정적 안내 — 블러 영역 좌표는 응답에 없다 (오탐 방지 7) */}
      <div className="flex w-full items-center gap-xs rounded-md bg-surface-soft px-md py-sm">
        <ShieldCheck
          aria-hidden="true"
          className="size-4 shrink-0 text-primary"
        />
        <span className="text-fm-label text-foreground-muted">
          얼굴·번호판 등 개인정보 영역에 AI 블러가 적용됐어요
        </span>
      </div>
    </ModalCard>
  </DialogShell>
);
