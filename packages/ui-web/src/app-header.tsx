import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "./lib/utils";

interface AppHeaderProps {
  title: string;
  /** 지정하면 좌측 뒤로가기 버튼 표시 */
  onBack?: () => void;
  /** 우측 슬롯 (없으면 타이틀 중앙 정렬용 스페이서) */
  right?: ReactNode;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap AppHeader" (node 13406:709) — 앱 화면 헤더 (h 48).
 *
 * @example
 * <AppHeader title="화면 타이틀" onBack={() => navigate(-1)} />
 */
export const AppHeader = ({
  title,
  onBack,
  right,
  className,
}: AppHeaderProps) => (
  <header
    className={cn(
      "flex h-12 w-full items-center gap-md border-b border-border bg-background px-lg",
      className,
    )}
  >
    {onBack ? (
      <button
        type="button"
        aria-label="뒤로 가기"
        onClick={onBack}
        className="flex size-4 shrink-0 items-center justify-center text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
    ) : (
      <span aria-hidden className="size-4 shrink-0" />
    )}
    <h1 className="min-w-0 flex-1 text-center text-fm-heading text-foreground">
      {title}
    </h1>
    <span className="flex size-4 shrink-0 items-center justify-center">
      {right}
    </span>
  </header>
);
