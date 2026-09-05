import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useApproveSubmission } from "@/features/admin-review/api/use-approve-submission";
import { useRejectSubmission } from "@/features/admin-review/api/use-reject-submission";
import { useReviewSubmissionQuery } from "@/features/admin-review/api/use-review-submission-query";
import {
  canSubmitReject,
  ensureReasonCode,
  isInReview,
  lastRejection,
  parseSubmissionId,
  submissionStatusChip,
  toggleReasonCode,
  type DecisionErrorView,
  type RejectReasonCode,
} from "@/features/admin-review/model/review-decision";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { ApproveConfirmDialog } from "./ui/ApproveConfirmDialog";
import { ProcessedResultNote } from "./ui/ProcessedResultNote";
import { RejectReasonForm } from "./ui/RejectReasonForm";
import { ReviewAreaMap } from "./ui/ReviewAreaMap";
import { ReviewDecisionActions } from "./ui/ReviewDecisionActions";
import { ReviewDetailPanel } from "./ui/ReviewDetailPanel";

/**
 * 관리자 행사 심사 상세 (MSG-553) — `/admin/review/:submissionId`.
 * 좌 패널(요약·반려 입력·확정 조작) + 전면 지도(위치 영역·노출 범위) 2열이다.
 * 콘솔 셸 본문 패딩(p-10)을 음수 마진으로 상쇄해 지도가 화면을 꽉 채운다
 * (MSG-547 area 스텝 선례 — 셸·라우트는 건드리지 않는다).
 *
 * 반려 입력(항목 코드 + 사유)과 확인 모달 개폐, 실패 안내는 이 페이지의 로컬 상태다 —
 * 다른 화면과 공유할 상태가 없어 스토어를 만들지 않는다. 판정은 전부 순수 모델
 * (`features/admin-review/model/review-decision`)이 소유한다.
 *
 * 승인·반려 성공은 심사 큐로 복귀한다(AC 10) — 목록·카운트 무효화는 뮤테이션 훅이
 * 걸어 두므로 착지한 큐가 처리된 신청 없이 다시 그려진다.
 */
export const AdminReviewDetailPage = () => {
  useDocumentTitle(formatDocumentTitle("심사 상세"));
  const navigate = useNavigate();
  const { submissionId: rawSubmissionId } = useParams();
  const submissionId = parseSubmissionId(rawSubmissionId);
  const query = useReviewSubmissionQuery(submissionId);

  const [reasonCodes, setReasonCodes] = useState<RejectReasonCode[]>([]);
  const [reasonText, setReasonText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState<DecisionErrorView | null>(null);

  const backToQueue = () => navigate(CONSOLE_ROUTES.adminReview);

  const handleFailed = (failure: DecisionErrorView) => {
    // 실패는 화면을 유지한다 — 모달만 닫고 안내를 패널에 남긴다 (AC 11)
    setConfirmOpen(false);
    setNotice(failure);
    // 격자 겹침(13452)의 다음 조작은 서버 doc이 지정한 AREA 반려다 (승인 질문 6)
    if (failure.nextStep === "rejectArea") {
      setReasonCodes((codes) => ensureReasonCode(codes, "AREA"));
    }
  };

  const approve = useApproveSubmission({
    onApproved: backToQueue,
    onFailed: handleFailed,
  });
  const reject = useRejectSubmission({
    onRejected: backToQueue,
    onFailed: handleFailed,
  });

  const submission = query.detail;
  // 두 확정이 교차 발사되지 않게 진행 중에는 양쪽을 함께 잠근다 (추정 12)
  const isDeciding = approve.isPending || reject.isPending;

  return (
    <div className="-m-10 flex min-h-0 flex-1">
      <ReviewDetailPanel
        detail={submission}
        isPending={query.isPending}
        isError={query.isError}
        isNotFound={submissionId === null || query.isNotFound}
        onRetry={query.retry}
        onBackToQueue={backToQueue}
      >
        {submission !== null &&
          (isInReview(submission.status) ? (
            <>
              <RejectReasonForm
                codes={reasonCodes}
                reasonText={reasonText}
                disabled={isDeciding}
                onToggle={(code) =>
                  setReasonCodes((codes) => toggleReasonCode(codes, code))
                }
                onReasonTextChange={setReasonText}
              />
              <ReviewDecisionActions
                canReject={canSubmitReject(reasonCodes, reasonText)}
                isPending={isDeciding}
                notice={notice}
                onBackToQueue={backToQueue}
                onReject={() => {
                  setNotice(null);
                  reject.mutate({
                    submissionId: submission.id,
                    reasonCodes,
                    reasonText,
                  });
                }}
                onApproveClick={() => {
                  setNotice(null);
                  setConfirmOpen(true);
                }}
              />
            </>
          ) : (
            <ProcessedResultNote
              statusLabel={
                submissionStatusChip(submission.status)?.label ??
                submission.status
              }
              // 반려 항목·사유는 REJECTED에서만 — 반려 후 재신청돼 승인된 신청도
              // 이력에 REJECTED 행을 남기므로, 무조건 파생하면 승인 결과 아래에
              // 옛 반려 사유가 새어 나온다 (codex 2R P2)
              rejection={
                submission.status === "REJECTED"
                  ? lastRejection(submission.history)
                  : null
              }
            />
          ))}
      </ReviewDetailPanel>

      {submission === null ? (
        <div className="min-w-0 flex-1 bg-surface" />
      ) : (
        <ReviewAreaMap
          locations={submission.locations}
          exposureRect={submission.exposureRect}
        />
      )}

      {submission !== null && (
        <ApproveConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          isPending={approve.isPending}
          onConfirm={() => approve.mutate({ submissionId: submission.id })}
        />
      )}
    </div>
  );
};
