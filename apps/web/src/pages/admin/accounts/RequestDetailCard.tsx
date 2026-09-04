import { RetryNotice, Skeleton } from "@fillmap/ui-web";
import { accountRequestStatusView } from "@/features/admin-accounts/model/account-view";
import type { AdminOrgAccountRequestDetailResponseDto } from "@/shared/api/generated/types.gen";
import { DetailField, PendingActions, ProcessedResult } from "./DetailFields";

interface RequestDetailCardProps {
  /** 선택된 행이 있는지 — 없으면 빈 상태 (AC 14) */
  selected: boolean;
  detail: AdminOrgAccountRequestDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onApprove: () => void;
  onReject: () => void;
  isMutating: boolean;
  /** 처리 결과·실패 안내 — 없으면 미렌더 */
  notice: string | null;
}

/** Figma 15579:2326 각주 — 승인 직전 재고지 */
const ISSUE_FOOTNOTE = "발급 시 공식 이메일로 초기 비밀번호가 발송됩니다.";

/**
 * 선택한 발급 요청 카드 (MSG-551 AC 11·12 — Figma 15579:2326 우측 카드).
 *
 * 상세 응답 전체(요청 내용·기관·담당자·연락처·이메일·예정 행사)를 이미 보여 주므로
 * Figma의 [요청 상세 보기] 버튼은 미구현이 정본이다 — 이동할 상세 라우트가 없다.
 * 예정 행사의 기간 표기("· 9.5–9.7")도 상세 DTO에 기간 필드가 없어 행사명만 싣는다
 * (스펙 Figma 오탐 방지 목록 · BE 환류 후보).
 *
 * **처리된 요청(발급됨·반려)은 읽기 전용**이다 — 버튼 대신 처리 시각·사유·발급 계정을
 * 보여 준다. 이미 처리 409(1422)를 조작 제거로 예방한다(스펙 추정 13).
 */
export const RequestDetailCard = ({
  selected,
  detail,
  isPending,
  isError,
  onRetry,
  onApprove,
  onReject,
  isMutating,
  notice,
}: RequestDetailCardProps) => (
  <section className="flex w-83 shrink-0 flex-col gap-md rounded-md bg-background p-lg shadow-raised">
    <h3 className="text-fm-title text-foreground">선택한 요청</h3>

    {!selected ? (
      <p className="text-fm-body text-foreground-muted">
        행을 선택하면 요청 상세가 표시됩니다.
      </p>
    ) : isError ? (
      <RetryNotice message="요청 상세를 불러오지 못했어요" onRetry={onRetry} />
    ) : isPending || detail === null ? (
      <div className="flex flex-col gap-md">
        <Skeleton className="h-20 w-full rounded-sm" />
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-2/5" />
      </div>
    ) : (
      <>
        <p className="whitespace-pre-line rounded-sm bg-surface-soft p-sm text-fm-body text-foreground-body">
          {detail.content}
        </p>

        <dl className="flex flex-col gap-sm">
          <DetailField label="요청 기관" value={detail.orgName} />
          <DetailField
            label="담당자"
            value={`${detail.contactName} · ${detail.contactPhone}`}
          />
          <DetailField label="공식 이메일" value={detail.email} />
          <DetailField label="예정 행사" value={detail.eventName} />
        </dl>

        {detail.status === "PENDING" ? (
          <PendingActions
            approveText="계정 발급"
            footnote={ISSUE_FOOTNOTE}
            isMutating={isMutating}
            onApprove={onApprove}
            onReject={onReject}
          />
        ) : (
          <ProcessedResult
            status={accountRequestStatusView(detail.status)}
            processedAt={detail.processedAt}
            rejectReason={detail.rejectReason}
          >
            {detail.issuedUserId !== null && (
              <p className="text-fm-caption text-foreground-body">
                {`발급 계정 #${detail.issuedUserId}`}
              </p>
            )}
          </ProcessedResult>
        )}
      </>
    )}

    {notice !== null && (
      <p role="status" className="text-fm-caption text-foreground-body">
        {notice}
      </p>
    )}
  </section>
);
