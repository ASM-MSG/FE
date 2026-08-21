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
  /** 지정하면 버튼 행 아래 전폭 보조(soft) 버튼을 렌더 — 위저드 "이전 단계로" 등 스택형 보조 액션 */
  secondaryText?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  onSecondary?: () => void;
  /** 지정하면 우측 상단 닫기 버튼 표시 */
  onClose?: () => void;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap ModalCard" (node 13406:696) — 모달/다이얼로그 쉘.
 * 스택형 보조 버튼(secondaryText)은 ver 10 업로드 위저드(node 14324:12172)의
 * "이전 단계로" 전폭 soft 버튼 — 가로 cancel/confirm 행 아래에 쌓인다.
 * 프레젠테이셔널 카드 — 오버레이/포털/포커스 트랩은 사용하는 쪽(Radix Dialog 등)에서 감싼다.
 *
 * @example
 * <ModalCard title="삭제할까요?" cancelText="취소" confirmText="확인" onConfirm={onDelete} />
 * <ModalCard title="미리보기" confirmText="게시" secondaryText="이전 단계로" onSecondary={onBack} />
 */
export const ModalCard = ({
  title,
  description,
  children,
  cancelText,
  confirmText,
  confirmDisabled,
  confirmVariant = "primary",
  secondaryText,
  onCancel,
  onConfirm,
  onSecondary,
  onClose,
  className,
}: ModalCardProps) => (
  <div
    role="dialog"
    aria-label={title}
    className={cn(
      "flex w-full max-w-120 flex-col gap-md rounded-[20px] bg-surface-elevated p-7 shadow-modal",
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
          <X className="size-4" />
        </button>
      )}
    </div>
    {description && (
      <p className="text-fm-body text-foreground-body">{description}</p>
    )}
    {children}
    {(cancelText || confirmText || secondaryText) && (
      <div className="flex flex-col gap-2.5">
        {(cancelText || confirmText) && (
          <div className="flex gap-2.5">
            {cancelText && (
              <button
                type="button"
                onClick={onCancel}
                className="h-12 min-w-0 flex-1 rounded-full border border-border text-fm-title leading-none text-foreground-body transition-[filter] active:brightness-[0.86]"
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
                  "h-12 min-w-0 flex-1 rounded-full text-fm-title leading-none text-primary-foreground transition-[filter] active:brightness-[0.86] disabled:pointer-events-none disabled:opacity-50",
                  confirmVariant === "danger" ? "bg-error" : "bg-primary",
                )}
              >
                {confirmText}
              </button>
            )}
          </div>
        )}
        {secondaryText && (
          <button
            type="button"
            onClick={onSecondary}
            className="h-12 w-full rounded-full bg-surface-soft text-fm-title leading-none text-foreground-body transition-[filter] active:brightness-[0.86]"
          >
            {secondaryText}
          </button>
        )}
      </div>
    )}
  </div>
);
