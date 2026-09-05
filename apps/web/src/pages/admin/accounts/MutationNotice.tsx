import { cn } from "@fillmap/ui-web";

/**
 * 처리 결과 안내 — 실패는 `role="alert"`(assertive)+에러색으로 성공과 구분한다.
 * IssueAccountForm의 성공/실패 분리와 같은 패턴을 큐 2종·재발송 카드가 공유한다
 * (PR #136 리뷰 반영 — 종전에는 실패도 role="status"+중립색으로 나가 낭독·시각
 * 양쪽에서 성공과 구분되지 않았다).
 */
export interface MutationNotice {
  message: string;
  isError: boolean;
}

export const MutationNoticeText = ({
  notice,
}: {
  notice: MutationNotice | null;
}) =>
  notice === null ? null : (
    <p
      role={notice.isError ? "alert" : "status"}
      className={cn(
        "text-fm-caption",
        notice.isError ? "text-error" : "text-foreground-body",
      )}
    >
      {notice.message}
    </p>
  );
