import { useState } from "react";
import {
  useApproveEmailChange,
  useRejectEmailChange,
} from "@/features/admin-accounts/api/use-email-change-mutations";
import { useEmailChangeRequestsQuery } from "@/features/admin-accounts/api/use-email-change-requests-query";
import {
  type EmailChangeStatus,
  emailChangeApprovedNotice,
  emailChangePillViews,
  emailChangeQueueText,
  truncationNotice,
} from "@/features/admin-accounts/model/account-view";
// 선택 id 파생은 심사 큐가 이미 소유한다 — 같은 폴백 규칙을 복제하지 않는다 (MSG-552)
import { resolveSelectedId } from "@/features/admin-review/model/submission-view";
import { EmailChangeDetailCard } from "./EmailChangeDetailCard";
import { EmailChangeTable } from "./EmailChangeTable";
import type { MutationNotice } from "./MutationNotice";
import { QueueSectionLayout } from "./QueueSectionLayout";
import { RejectReasonDialog } from "./RejectReasonDialog";

const TITLE = "아이디 변경 요청";
const DESCRIPTION =
  "운영자가 요청한 로그인 아이디(공식 이메일) 변경을 대조해 승인하거나 반려합니다.";

/**
 * 반려 모달이 열릴 때 **동결한 대상** (codex 리뷰 P1 — `RequestQueueSection`과 같은 사유).
 * 선택은 파생이라 모달이 열린 동안의 재조회가 다음 행으로 갈아탈 수 있다.
 */
interface RejectTarget {
  requestId: number;
  requestedAt: string;
  requestedEmail: string;
}

/**
 * 아이디 변경 요청 구획 (MSG-551 AC 13 — Figma 부재, 발급 요청 큐 구조 답습).
 *
 * 발급 요청 큐와 같은 골격이되 **상세 API가 없다** — 목록 항목이 상세 전체이고,
 * 승인·반려에 에코하는 검토 기준 시각은 그 항목의 `createdAt`이다(재요청이 같은 대기
 * 행을 덮어쓴다 — 서버 doc).
 */
export const EmailChangeSection = () => {
  const [status, setStatus] = useState<EmailChangeStatus>("PENDING");
  const [pinnedId, setPinnedId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [notice, setNotice] = useState<MutationNotice | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const list = useEmailChangeRequestsQuery(status);
  const requests = list.isPlaceholder ? [] : list.requests;
  const selectedId = resolveSelectedId(pinnedId, requests);
  const selected =
    requests.find((request) => request.id === selectedId) ?? null;
  const queueText = emailChangeQueueText(status);

  const approve = useApproveEmailChange({
    onApproved: (result) =>
      setNotice({
        message: emailChangeApprovedNotice(result.emailSent, result.email),
        isError: false,
      }),
    onFailed: (failure) =>
      setNotice({ message: failure.message, isError: true }),
  });

  const reject = useRejectEmailChange({
    onRejected: () => {
      setRejectTarget(null);
      setRejectError(null);
      setNotice({
        message: "요청을 반려했어요. 사유는 수기 통보 재료로 저장됩니다.",
        isError: false,
      });
    },
    onFailed: (failure) => {
      if (failure.staleServerState) {
        setRejectTarget(null);
        setRejectError(null);
        setNotice({ message: failure.message, isError: true });
        return;
      }
      setRejectError(failure.message);
    },
  });

  return (
    <>
      <QueueSectionLayout
        title={TITLE}
        description={DESCRIPTION}
        pills={{
          label: "아이디 변경 상태",
          views: emailChangePillViews(list.counts),
          active: status,
          onSelect: (next) => {
            setStatus(next);
            setPinnedId(null);
            setNotice(null);
          },
        }}
        list={{
          title: queueText.listTitle,
          errorMessage: "아이디 변경 요청을 불러오지 못했어요",
          emptyMessage: queueText.emptyMessage,
          isError: list.isError,
          isLoading: list.isPending || list.isPlaceholder,
          isEmpty: requests.length === 0,
          onRetry: list.retry,
          truncationNotice: truncationNotice(
            list.totalElements,
            requests.length,
          ),
          children: (
            <EmailChangeTable
              requests={requests}
              selectedId={selectedId}
              onSelect={(requestId) => {
                setPinnedId(requestId);
                setNotice(null);
              }}
            />
          ),
        }}
        detail={
          <EmailChangeDetailCard
            selected={selected}
            isMutating={approve.isPending || reject.isPending}
            notice={notice}
            onApprove={() => {
              if (selected === null) return;
              setNotice(null);
              approve.mutate({
                requestId: selected.id,
                requestedAt: selected.createdAt,
              });
            }}
            onReject={() => {
              if (selected === null) return;
              setRejectError(null);
              // 대상 동결 — 확정까지의 재조회가 선택을 갈아타도 열 때 보던
              // 요청에만 반려가 나간다 (codex P1)
              setRejectTarget({
                requestId: selected.id,
                requestedAt: selected.createdAt,
                requestedEmail: selected.requestedEmail,
              });
            }}
          />
        }
      />

      <RejectReasonDialog
        open={rejectTarget !== null}
        onOpenChange={(next) => {
          if (!next) setRejectTarget(null);
        }}
        title="아이디 변경 요청 반려"
        description={`'${rejectTarget?.requestedEmail ?? ""}'로의 아이디 변경을 반려합니다.`}
        isPending={reject.isPending}
        errorMessage={rejectError}
        onConfirm={(reason) => {
          if (rejectTarget === null) return;
          reject.mutate({
            requestId: rejectTarget.requestId,
            reason,
            requestedAt: rejectTarget.requestedAt,
          });
        }}
      />
    </>
  );
};
