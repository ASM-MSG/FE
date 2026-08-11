import { Loader2 } from "lucide-react";
import { ModalCard } from "@fillmap/ui-web";

interface AnalyzingModalProps {
  /** 선분석 준비 단계(presign·원본 업로드) 실패 안내 — null이면 진행 중 표시 */
  failureMessage: string | null;
  /** 실패 시 재시도 — 성공한 단계는 건너뛴다 (B11) */
  onRetry: () => void;
  /** 실패 시 선택 스텝으로 복귀 */
  onCancel: () => void;
}

/**
 * AI 선분석 로딩 모달 (MSG-329 B3) — presign → 원본 S3 PUT → highlight-preview 동안 표시.
 * 진행 바는 불확정(indeterminate) 스피너다 — 동기 API라 실제 진행률을 알 수 없다
 * (스펙 추정 4 확정, Figma의 확정형 진행 바·"보통 10~20초"·"영상 길이 0:42"는 오탐 방지 3).
 * 진행 중에는 닫기 수단(✕·버튼)이 없다 — 닫기 차단은 상위(UploadModal)의 onOpenChange 가드와
 * 함께 B12를 구성한다. 실패 시에만 재시도/복귀 버튼이 생긴다.
 */
export const AnalyzingModal = ({
  failureMessage,
  onRetry,
  onCancel,
}: AnalyzingModalProps) =>
  failureMessage === null ? (
    <ModalCard
      title="잠시만 기다려주세요"
      description="AI가 영상을 분석해 하이라이트 추천 구간을 생성하고 있어요"
    >
      <div className="flex flex-col items-center gap-sm py-md">
        <Loader2
          aria-hidden="true"
          className="size-8 animate-spin text-primary"
        />
        {/* 소요 안내 — 확정 시간 문구 금지 (티켓 11 확정) */}
        <p className="text-fm-label text-foreground-muted">
          영상 길이에 따라 수 초~수십 초 걸릴 수 있어요
        </p>
      </div>
    </ModalCard>
  ) : (
    <ModalCard
      title="분석을 시작하지 못했어요"
      cancelText="이전으로"
      confirmText="다시 시도"
      onCancel={onCancel}
      onConfirm={onRetry}
    >
      <p role="alert" className="text-fm-body text-foreground-body">
        {failureMessage}
      </p>
    </ModalCard>
  );
