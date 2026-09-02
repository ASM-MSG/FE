import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RetryNotice, Skeleton } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useSubmissionDetailQuery } from "@/features/admin-review/api/use-submission-detail-query";
import { useSubmissionsQuery } from "@/features/admin-review/api/use-submissions-query";
import {
  resolveSelectedId,
  submissionStatusView,
  type SubmissionStatus,
} from "@/features/admin-review/model/submission-view";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { ReviewPreviewCard } from "./ui/ReviewPreviewCard";
import { ReviewQueueTable } from "./ui/ReviewQueueTable";
import { ReviewStatusTabs } from "./ui/ReviewStatusTabs";

const QueueSkeleton = () => (
  <div className="flex flex-col gap-sm">
    <p role="status" className="sr-only">
      대기 신청을 불러오는 중
    </p>
    {[0, 1, 2].map((row) => (
      <Skeleton key={row} className="h-14 w-full rounded-sm" />
    ))}
  </div>
);

/**
 * 관리자 행사 심사 큐 (MSG-552) — 상태 탭 + 대기 신청 테이블 + 선택 신청 미리보기.
 * 콘솔 셸(MSG-541)의 `<main>` 안에 들어가는 본문이라 셸·가드·라우트는 건드리지 않는다.
 *
 * 선택 상태는 페이지 로컬이다: 탭(`status`)과 사용자가 고른 행(`pinnedId`)만 갖고,
 * **실제 선택 id는 파생**한다 — `pinnedId ?? 첫 행`이라 목록 도착 시 첫 행이 자동
 * 선택되고(AC 8), 탭 전환에서 `pinnedId`를 비우면 새 목록의 첫 행이 다시 선택된다.
 * 파생이라 "목록 도착 후 선택" effect가 필요 없다.
 */
export const AdminReviewQueuePage = () => {
  useDocumentTitle(formatDocumentTitle("행사 등록 심사"));
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubmissionStatus>("IN_REVIEW");
  const [pinnedId, setPinnedId] = useState<number | null>(null);

  const list = useSubmissionsQuery(status);
  // 탭 전환 중(placeholderData)의 직전 목록은 행으로 쓰지 않는다 — counts만 유지된다(추정 9)
  const submissions = list.isPlaceholder ? [] : list.submissions;
  const selectedId = resolveSelectedId(pinnedId, submissions);
  const detail = useSubmissionDetailQuery(selectedId);

  const isListLoading = list.isPending || list.isPlaceholder;
  const statusLabel = submissionStatusView(status).label;

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex flex-col gap-xxs">
        <h1 className="text-fm-display text-foreground">행사 등록 심사</h1>
        <p className="text-fm-body text-foreground-muted">
          승인 전 신청의 위치 영역·기간·홍보물을 검토합니다.
        </p>
      </header>

      <ReviewStatusTabs
        status={status}
        counts={list.counts}
        onSelect={(next) => {
          setStatus(next);
          setPinnedId(null);
        }}
      />

      <div className="flex items-start gap-lg">
        <section
          aria-labelledby="review-queue-heading"
          className="flex min-h-160 flex-1 flex-col gap-md self-stretch rounded-md border border-border bg-background p-lg"
        >
          <h2
            id="review-queue-heading"
            className="text-fm-title text-foreground"
          >
            대기 신청
          </h2>
          {list.isError ? (
            <RetryNotice
              message="대기 신청을 불러오지 못했어요"
              onRetry={list.retry}
            />
          ) : isListLoading ? (
            <QueueSkeleton />
          ) : submissions.length === 0 ? (
            <p className="text-fm-body text-foreground-muted">
              {`${statusLabel} 상태의 신청이 없어요`}
            </p>
          ) : (
            <ReviewQueueTable
              submissions={submissions}
              selectedId={selectedId}
              onSelect={setPinnedId}
            />
          )}
        </section>

        <ReviewPreviewCard
          selected={selectedId !== null}
          detail={detail.detail}
          isPending={detail.isPending}
          isError={detail.isError}
          onRetry={detail.retry}
          onOpenDetail={() => {
            if (selectedId === null) return;
            navigate(
              CONSOLE_ROUTES.adminReviewDetail.replace(
                ":submissionId",
                String(selectedId),
              ),
            );
          }}
        />
      </div>
    </div>
  );
};
