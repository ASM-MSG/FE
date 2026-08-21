import { Button } from "@fillmap/ui-web";

interface RetryNoticeProps {
  /** 실패 안내 문구 — "…을 불러오지 못했어요" 류 */
  message: string;
  onRetry: () => void;
}

/**
 * 요청 실패 안내 + 재시도 행 (MSG-328 AC 11·17) — 지역 패널·검색 드롭다운 공용.
 * 같은 마크업이 5곳으로 늘어나 추출했다(check:duplication 신규 카피 차단).
 * 기존 패널(HomeCellDetailPanel·VideoMiniPanel)의 유사 블록은 이 티켓 범위 밖 — 수술적 변경.
 */
export const RetryNotice = ({ message, onRetry }: RetryNoticeProps) => (
  <div className="flex items-center justify-between gap-sm py-xs">
    <p className="text-fm-body text-foreground-muted">{message}</p>
    <Button text="다시 시도" variant="secondary" size="sm" onClick={onRetry} />
  </div>
);
