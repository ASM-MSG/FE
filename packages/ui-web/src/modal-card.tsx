import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./lib/utils";

interface ModalCardProps {
  title: string;
  description?: string;
  /** 콘텐츠 슬롯 */
  children?: ReactNode;
  cancelText?: string;
  confirmText?: string;
  /** true면 확인 버튼을 비활성(클릭 차단 + 비활성 시각)한다 */
  confirmDisabled?: boolean;
  /** 확인 버튼 색상 — danger는 삭제·신고 등 파괴적 액션용 (기본 primary) */
  confirmVariant?: "primary" | "danger";
  onCancel?: () => void;
  onConfirm?: () => void;
  /** 지정하면 우측 상단 닫기 버튼 표시 */
  onClose?: () => void;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap ModalCard" (node 13406:696) — 모달/다이얼로그 쉘.
 * 프레젠테이셔널 카드 — 오버레이/포털/포커스 트랩은 사용하는 쪽(Radix Dialog 등)에서 감싼다.
 *
 * @example
 * <ModalCard title="삭제할까요?" cancelText="취소" confirmText="확인" onConfirm={onDelete} />
 */
export const ModalCard = ({
  title,
  description,
  children,
  cancelText,
  confirmText,
  confirmDisabled,
  confirmVariant = "primary",
  onCancel,
  onConfirm,
  onClose,
  className,
}: ModalCardProps) => (
  <div
    role="dialog"
    aria-label={title}
    className={cn(
      "flex w-full max-w-[480px] flex-col gap-md rounded-[20px] bg-surface-elevated p-[28px] shadow-modal",
      className,
    )}
  >
    <div className="flex items-center">
      <h2 className="min-w-0 flex-1 text-fm-display text-foreground">
        {title}
      </h2>
      {onClose && (
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="shrink-0 text-foreground-muted transition-colors hover:text-foreground"
        >
          <X className="size-[16px]" />
        </button>
      )}
    </div>
    {description && (
      <p className="text-fm-body text-foreground-body">{description}</p>
    )}
    {children}
    {(cancelText || confirmText) && (
      <div className="flex gap-[10px]">
        {cancelText && (
          <button
            type="button"
            onClick={onCancel}
            className="h-[48px] min-w-0 flex-1 rounded-full border border-border text-fm-title leading-none text-foreground-body transition-[filter] active:brightness-[0.86]"
          >
            {cancelText}
          </button>
        )}
        {confirmText && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={cn(
              "h-[48px] min-w-0 flex-1 rounded-full text-fm-title leading-none text-primary-foreground transition-[filter] active:brightness-[0.86] disabled:pointer-events-none disabled:opacity-50",
              confirmVariant === "danger" ? "bg-error" : "bg-primary",
            )}
          >
            {confirmText}
          </button>
        )}
      </div>
    )}
  </div>
);
