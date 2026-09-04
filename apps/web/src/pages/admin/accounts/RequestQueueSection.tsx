import { useState } from "react";
import { useAccountRequestDetailQuery } from "@/features/admin-accounts/api/use-account-request-detail-query";
import {
  useApproveAccountRequest,
  useRejectAccountRequest,
} from "@/features/admin-accounts/api/use-account-request-mutations";
import { useAccountRequestsQuery } from "@/features/admin-accounts/api/use-account-requests-query";
import {
  type AccountRequestStatus,
  accountRequestPillViews,
  accountRequestQueueText,
  issuedNotice,
  truncationNotice,
} from "@/features/admin-accounts/model/account-view";
// 선택 id 파생은 심사 큐가 이미 소유한다 — 같은 폴백 규칙을 복제하지 않는다 (MSG-552)
import { resolveSelectedId } from "@/features/admin-review/model/submission-view";
import { QueueSectionLayout } from "./QueueSectionLayout";
import { RejectReasonDialog } from "./RejectReasonDialog";
import { RequestDetailCard } from "./RequestDetailCard";
import { RequestQueueTable } from "./RequestQueueTable";

/** Figma 15579:2326 헤더 문구 */
const TITLE = "계정 발급 요청";
const DESCRIPTION =
  "기관이 보낸 계정 발급 요청을 검토해 승인하거나 사유와 함께 반려합니다.";

/**
 * 반려 모달이 열릴 때 **동결한 대상** (codex 리뷰 P1).
 * 선택 id는 파생(`pinnedId ?? 첫 행`)이라 모달이 열린 동안 목록이 재조회되면
 * (포커스 복귀 재조회·다른 관리자의 처리로 고정 행이 사라짐) 상세가 다음 행으로
 * 갈아탈 수 있다 — 확정 시점에 `detail.detail`을 읽으면 **열 때 보던 요청이 아닌
 * 다른 요청을 반려**하게 되고, 에코하는 updatedAt도 유효해 서버가 그대로 받는다.
 */
interface RejectTarget {
  requestId: number;
  updatedAt: string;
  orgName: string;
}

/**
 * 계정 발급 요청 구획 (MSG-551 AC 11·12 — Figma 15579:2326).
 *
 * 상태 4개만 소유한다: 필터 status / 고정 행 / 반려 대상 / 안내.
 * **실제 선택 id는 파생**이다(`pinnedId ?? 첫 행` — MSG-552 선례) — 목록 도착 시 첫 행이
 * 자동 선택되고 필터를 바꾸면 새 목록의 첫 행이 다시 선택된다. 자동 선택 effect가 없다.
 *
 * 승인·반려 바디의 검토 기준 시각은 **상세 응답의 `updatedAt`을 그대로 에코**한다 —
 * 목록 항목의 값을 쓰면 백그라운드 재조회 시점 차이로 409(1426)를 자초한다.
 */
export const RequestQueueSection = () => {
  const [status, setStatus] = useState<AccountRequestStatus>("PENDING");
  const [pinnedId, setPinnedId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const list = useAccountRequestsQuery(status);
  // 필터 전환 중(placeholderData)의 직전 목록은 행으로 쓰지 않는다 — counts만 유지된다
  const requests = list.isPlaceholder ? [] : list.requests;
  const selectedId = resolveSelectedId(pinnedId, requests);
  const detail = useAccountRequestDetailQuery(selectedId);
  const queueText = accountRequestQueueText(status);

  const approve = useApproveAccountRequest({
    onApproved: (result) => {
      setNotice(issuedNotice(result.emailSent));
    },
    onFailed: (failure) => setNotice(failure.message),
  });

  const reject = useRejectAccountRequest({
    onRejected: () => {
      setRejectTarget(null);
      setRejectError(null);
      setNotice("요청을 반려했어요. 사유는 수기 통보 재료로 저장됩니다.");
    },
    onFailed: (failure) => {
      // 서버 진실이 바뀐 실패면 모달을 닫고 카드 안내로 알린다 — 훅이 목록·상세를
      // 재조회하므로 스테일 카드에서 같은 확정을 반복할 수 없다 (MSG-554 선례)
      if (failure.staleServerState) {
        setRejectTarget(null);
        setRejectError(null);
        setNotice(failure.message);
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
          label: "발급 요청 상태",
          views: accountRequestPillViews(list.counts),
          active: status,
          onSelect: (next) => {
            setStatus(next);
            setPinnedId(null);
            setNotice(null);
          },
        }}
        list={{
          title: queueText.listTitle,
          errorMessage: "계정 발급 요청을 불러오지 못했어요",
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
            <RequestQueueTable
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
          <RequestDetailCard
            selected={selectedId !== null}
            detail={detail.detail}
            isPending={detail.isPending}
            isError={detail.isError}
            onRetry={detail.retry}
            isMutating={approve.isPending || reject.isPending}
            notice={notice}
            onApprove={() => {
              if (detail.detail === null) return;
              setNotice(null);
              approve.mutate({
                requestId: detail.detail.id,
                updatedAt: detail.detail.updatedAt,
              });
            }}
            onReject={() => {
              if (detail.detail === null) return;
              setRejectError(null);
              // 대상을 여기서 동결한다 — 확정까지의 재조회가 선택을 갈아타도
              // 열 때 보던 요청에만 반려가 나간다 (codex P1)
              setRejectTarget({
                requestId: detail.detail.id,
                updatedAt: detail.detail.updatedAt,
                orgName: detail.detail.orgName,
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
        title="계정 발급 요청 반려"
        description={`'${rejectTarget?.orgName ?? ""}'의 계정 발급 요청을 반려합니다.`}
        isPending={reject.isPending}
        errorMessage={rejectError}
        onConfirm={(reason) => {
          if (rejectTarget === null) return;
          reject.mutate({
            requestId: rejectTarget.requestId,
            reason,
            updatedAt: rejectTarget.updatedAt,
          });
        }}
      />
    </>
  );
};
