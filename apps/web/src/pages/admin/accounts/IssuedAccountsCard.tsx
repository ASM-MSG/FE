import { useState } from "react";
import { Button, RetryNotice, Skeleton } from "@fillmap/ui-web";
import { useAccountsQuery } from "@/features/admin-accounts/api/use-accounts-query";
import { useResendPassword } from "@/features/admin-accounts/api/use-resend-password";
import {
  accountStatusView,
  orgNameLabel,
  resendNotice,
  truncationNotice,
} from "@/features/admin-accounts/model/account-view";
import type { AdminOrgAccountItemResponseDto } from "@/shared/api/generated/types.gen";
import { formatKstReceiptTime } from "@/shared/format";
import { ResendPasswordDialog } from "./ResendPasswordDialog";
import { StatusChip } from "./StatusChip";

/**
 * 최근 발급 계정 목록 (MSG-551 AC 3·10 — Figma 15525:9064 우측 카드).
 *
 * 행 캡션은 이메일(계정 아이디)이다 — Figma의 `provider=LOCAL` 리터럴은 DTO 주석을
 * 옮겨 적은 디자인 시점 표기라 렌더하지 않는다(스펙 추정 4, 목록은 LOCAL만 담는다).
 *
 * **재발송 버튼은 초기 로그인 전(mustChange=true) 행에만** 둔다 — 서버 대상이 그 계정
 * 뿐이라 사용 중 행의 버튼은 409(1423)를 부르는 함정이다(스펙 추정 3).
 */
export const IssuedAccountsCard = () => {
  const { accounts, totalElements, isPending, isError, retry } =
    useAccountsQuery();
  // 상한(100) 초과분이 조용히 잘리지 않게 건수를 고지한다 (codex P2)
  const listTruncation = truncationNotice(totalElements, accounts.length);
  const [target, setTarget] = useState<AdminOrgAccountItemResponseDto | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  const resend = useResendPassword({
    onResent: (result) => {
      setTarget(null);
      setNotice(resendNotice(result.emailSent));
    },
    onFailed: (failure) => {
      // 실패 안내는 모달이 아니라 카드에서 낸다 — 1423은 목록 재조회로 버튼이 사라진다
      setTarget(null);
      setNotice(failure.message);
    },
  });

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-md rounded-md bg-background p-lg shadow-raised">
      <h3 className="text-fm-title text-foreground">최근 발급</h3>

      {isError ? (
        <RetryNotice message="계정 목록을 불러오지 못했어요" onRetry={retry} />
      ) : isPending ? (
        // 목록 자리 한 덩어리 — 행 수를 모르는 로딩에서 행 모양을 흉내내지 않는다
        <Skeleton className="h-50 w-full rounded-sm" />
      ) : accounts.length === 0 ? (
        <p className="text-fm-body text-foreground-muted">
          발급된 계정이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col">
          {accounts.map((account) => (
            <li
              key={account.userId}
              className="flex items-center gap-sm border-b border-border py-sm last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-xxs">
                <span className="truncate text-fm-body-strong text-foreground">
                  {orgNameLabel(account.orgName)}
                </span>
                <span className="truncate text-fm-caption text-foreground-muted">
                  {account.email}
                </span>
                <span className="text-fm-caption text-foreground-muted">
                  {`발급 ${formatKstReceiptTime(account.createdAt)}`}
                </span>
              </div>
              <StatusChip {...accountStatusView(account.mustChange)} />
              {account.mustChange && (
                <Button
                  text="비밀번호 재발송"
                  variant="secondary"
                  size="sm"
                  className="shrink-0 ring-1 ring-border"
                  onClick={() => {
                    setNotice(null);
                    setTarget(account);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {listTruncation !== null && (
        <p className="text-fm-caption text-foreground-muted">
          {listTruncation}
        </p>
      )}

      {notice !== null && (
        <p role="status" className="text-fm-caption text-foreground-body">
          {notice}
        </p>
      )}

      <ResendPasswordDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        email={target?.email ?? ""}
        isPending={resend.isPending}
        onConfirm={() => {
          if (target === null) return;
          resend.mutate({ userId: target.userId });
        }}
      />
    </section>
  );
};
