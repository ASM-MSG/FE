import { Button } from "./button";

interface RetryNoticeProps {
  /** 실패 안내 문구 — "…을 불러오지 못했어요" 류 */
  message: string;
  onRetry: () => void;
}

/**
 * 요청 실패 안내 + 재시도 행 (MSG-328 AC 11·17) — 패널·드롭다운 공용.
 * 같은 마크업이 5곳으로 늘어나 추출했고(check:duplication 신규 카피 차단),
 * MSG-488에서 두 번째 페이지(AI 경로추천)가 소비하게 되며 ui-web으로 승격했다 —
 * `pages/map-home/ui`에 남겨두면 `pages → pages` import가 된다(VideoOwnerMeta 선례).
 * 도메인 무관(문구 + 재시도 버튼 한 줄)이라 승격 대상이 맞다.
 *
 * @example
 * <RetryNotice message="지역 목록을 불러오지 못했어요" onRetry={refetch} />
 */
export const RetryNotice = ({ message, onRetry }: RetryNoticeProps) => (
  <div className="flex items-center justify-between gap-sm py-xs">
    <p className="text-fm-body text-foreground-muted">{message}</p>
    <Button text="다시 시도" variant="secondary" size="sm" onClick={onRetry} />
  </div>
);
