import { Text } from "react-native";
import { SheetNotice } from "../../map-home/ui/sheet-notice";
import type { RouteErrorNotice as RouteErrorNoticeData } from "../model/route-error";

/**
 * 실패 안내 (§1-4) — 재시도 가능한 실패는 기존 `SheetNotice`(문구 + "다시 시도") 그대로,
 * 14503(기능 꺼짐)은 재시도 행 없이 문구만 남긴다(제출 버튼도 세션 동안 비활성).
 * 로그인 필요(message null)는 화면에 아무것도 남기지 않는다 — 이동은 mutation이 했다.
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
    <SheetNotice message={notice.message} onRetry={onRetry} />
  ) : (
    <Text className="py-xs text-fm-body text-foreground-muted">
      {notice.message}
    </Text>
  );
};
