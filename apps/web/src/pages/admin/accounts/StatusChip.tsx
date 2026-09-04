import { cn } from "@fillmap/ui-web";
import type { StatusView } from "@/features/admin-accounts/model/account-view";

/** 색조별 칩 스타일 — 판정은 `account-view`의 순수 함수가 하고 여기서는 옮기기만 한다 */
const TONE_CLASS: Record<StatusView["tone"], string> = {
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  error: "bg-error/15 text-error",
  primary: "bg-primary/10 text-primary",
  neutral: "bg-surface text-foreground-muted",
};

/**
 * 상태 칩 (Figma 15525:9064 계정 상태 · 15579:2326 요청 상태).
 * 계정 상태(사용 중/초기 로그인 전)·발급 요청 상태·아이디 변경 상태가 공유한다.
 */
export const StatusChip = ({ label, tone }: StatusView) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-fm-caption font-medium",
      TONE_CLASS[tone],
    )}
  >
    {label}
  </span>
);
