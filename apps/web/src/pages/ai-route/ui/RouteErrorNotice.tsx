import { RetryNotice } from "@fillmap/ui-web";
import type { RouteErrorNotice as RouteErrorNoticeData } from "@/features/ai-route/model/route-error";

/**
 * 실패 안내 (§1-4) — 재시도 가능한 실패는 공용 `RetryNotice`(ui-web) 그대로,
 * 14503(기능 꺼짐)은 재시도 행 없이 문구만 남긴다(제출 버튼도 세션 동안 비활성).
 */
interface RouteErrorNoticeProps {
  notice: RouteErrorNoticeData;
  onRetry: () => void;
}

export const RouteErrorNotice = ({
  notice,
  onRetry,
}: RouteErrorNoticeProps) => {
  if (notice.message === null) return null;
  return notice.retryable ? (
    <RetryNotice message={notice.message} onRetry={onRetry} />
  ) : (
    <p className="py-xs text-fm-body text-foreground-muted">{notice.message}</p>
  );
};
