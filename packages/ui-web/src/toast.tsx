import type { ReactNode } from "react";
import type { ToastBaseProps } from "@fillmap/design-tokens";
import { cn } from "./lib/utils";

interface ToastProps extends ToastBaseProps {
  title: string;
  description?: string;
  /** dark 스타일 좌측 아이콘 슬롯. 기본 "i" 원형 배지 */
  icon?: ReactNode;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap Toast" (node 13405:708) — 안내 배너 (다크/라이트).
 * 프레젠테이셔널 쉘 — 표시/사라짐 타이밍은 사용하는 쪽(sonner 등)에서 제어한다.
 *
 * @example
 * <Toast title="업로드 전 최종 확인" description="AI 처리가 끝나면 ..." />
 * <Toast variant="light" title="AI 하이라이트 자동 추천" />
 */
export const Toast = ({
  variant = "dark",
  title,
  description,
  icon,
  className,
}: ToastProps) =>
  variant === "dark" ? (
    <div
      role="status"
      className={cn(
        "flex w-full items-start gap-sm rounded-lg bg-foreground py-[14px] pl-[14px] pr-md shadow-toast",
        className,
      )}
    >
      <span className="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-fm-base font-semibold text-primary-foreground">
        {icon ?? "i"}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p className="text-fm-base font-semibold text-foreground-inverse">
          {title}
        </p>
        {description && (
          <p className="text-fm-label font-normal text-foreground-inverse/65">
            {description}
          </p>
        )}
      </div>
    </div>
  ) : (
    <div
      role="status"
      className={cn(
        "flex w-full flex-col items-start gap-xxs rounded-md bg-surface-soft px-md py-sm",
        className,
      )}
    >
      <p className="text-fm-body-strong text-foreground">{title}</p>
      {description && (
        <p className="text-fm-label font-normal text-foreground-muted">
          {description}
        </p>
      )}
    </div>
  );
