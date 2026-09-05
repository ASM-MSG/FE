import type { ReactNode } from "react";
import { Button, RetryNotice, Skeleton, cn } from "@fillmap/ui-web";
import { submissionStatusChip } from "@/features/admin-review/model/review-decision";
import {
  formatPreviewPeriod,
  submissionTypeLabel,
  type SubmissionStatusTone,
} from "@/features/admin-review/model/submission-view";
import type { AdminEventSubmissionDetailResponseDto } from "@/shared/api/generated/types.gen";

interface ReviewDetailPanelProps {
  detail: AdminEventSubmissionDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  /** 미발견(비숫자 id·404) — 재시도가 아니라 큐 복귀로 유도한다 (AC 12) */
  isNotFound: boolean;
  onRetry: () => void;
  onBackToQueue: () => void;
  /** 확정 조작(심사 중) 또는 처리 결과 — 상세가 도착했을 때만 렌더된다 */
  children: ReactNode;
}

// 552 `ReviewQueueTable`의 상태 필과 같은 색조 — 그 파일은 이 티켓의 비파괴 대상이라
// 옮기지 않고 같은 값을 쓴다(정본은 `submissionStatusView`의 tone이다)
const TONE_CLASSES: Record<SubmissionStatusTone, string> = {
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  error: "bg-error/15 text-error",
};

const PanelSkeleton = () => (
  <div className="flex flex-col gap-sm">
    <p role="status" className="sr-only">
      신청 상세를 불러오는 중
    </p>
    {[0, 1, 2].map((row) => (
      <Skeleton key={row} className="h-12 w-full rounded-sm" />
    ))}
  </div>
);

/**
 * 심사 상세 좌 패널 (MSG-553 AC 5·12) — SOURCE: Figma "[v2] [관리자 3] 행사 심사 상세"
 * (node 15525:9683). 복귀 링크 + 화면 제목 + 상태 칩 + 행사 요약을 소유하고, 확정 조작
 * 영역은 슬롯으로 받는다.
 *
 * 제목(h1)과 복귀 링크는 **상태 분기 밖**에 둔다 — 로딩·실패·미발견에서도 화면이
 * 무엇이고 어디로 나갈 수 있는지가 남아야 한다(라우팅 스모크의 h1 단정도 이 계약이다).
 * "‹ 심사 큐"는 시안에 없지만 조작 없이 나갈 동선이 필요해 추가했다(승인 질문 5).
 */
export const ReviewDetailPanel = ({
  detail,
  isPending,
  isError,
  isNotFound,
  onRetry,
  onBackToQueue,
  children,
}: ReviewDetailPanelProps) => {
  const statusChip =
    detail === null ? null : submissionStatusChip(detail.status);
  const typeLabel = detail === null ? null : submissionTypeLabel(detail.type);

  return (
    <aside className="flex w-97 shrink-0 flex-col gap-md overflow-y-auto border-r border-border bg-background p-lg">
      <button
        type="button"
        onClick={onBackToQueue}
        className="self-start text-fm-label text-foreground-muted"
      >
        ‹ 심사 큐
      </button>

      <div className="flex items-center gap-sm">
        <h1 className="text-fm-display text-foreground">행사 등록 심사</h1>
        {statusChip !== null && (
          <span
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-fm-caption font-medium",
              TONE_CLASSES[statusChip.tone],
            )}
          >
            {statusChip.label}
          </span>
        )}
      </div>

      {isNotFound ? (
        <div className="flex flex-col items-start gap-sm">
          <p role="alert" className="text-fm-body text-foreground-body">
            신청을 찾을 수 없어요
          </p>
          <Button
            text="심사 큐로 돌아가기"
            variant="secondary"
            size="sm"
            onClick={onBackToQueue}
          />
        </div>
      ) : isError ? (
        <RetryNotice
          message="신청 상세를 불러오지 못했어요"
          onRetry={onRetry}
        />
      ) : isPending || detail === null ? (
        <PanelSkeleton />
      ) : (
        <>
          <div className="flex flex-col gap-xxs">
            <h2 className="text-fm-heading text-foreground">{detail.title}</h2>
            <p className="text-fm-body text-foreground-muted">
              {`${detail.organizerName} · ${formatPreviewPeriod(detail.startsOn, detail.endsOn)}`}
            </p>
            {typeLabel !== null && (
              <p className="text-fm-caption text-foreground-muted">
                {`${typeLabel} · ${detail.submissionNo}`}
              </p>
            )}
          </div>
          <div className="mt-auto flex flex-col gap-md pt-md">{children}</div>
        </>
      )}
    </aside>
  );
};
