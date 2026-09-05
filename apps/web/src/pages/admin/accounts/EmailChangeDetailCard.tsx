import {
  emailChangeStatusView,
  orgNameLabel,
} from "@/features/admin-accounts/model/account-view";
import type { AdminEmailChangeRequestItemResponseDto } from "@/shared/api/generated/types.gen";
import { formatKstReceiptTime } from "@/shared/format";
import { DetailField, PendingActions, ProcessedResult } from "./DetailFields";
import { type MutationNotice, MutationNoticeText } from "./MutationNotice";

interface EmailChangeDetailCardProps {
  /** 선택된 목록 항목 — 상세 API가 없어 이 항목이 상세 전체다 */
  selected: AdminEmailChangeRequestItemResponseDto | null;
  onApprove: () => void;
  onReject: () => void;
  isMutating: boolean;
  /** 처리 결과·실패 안내 — 없으면 미렌더 */
  notice: MutationNotice | null;
}

/** 승인 직전 재고지 — 아이디가 바뀌면 다음 로그인부터 새 이메일을 쓴다 */
const APPROVE_FOOTNOTE =
  "승인하면 로그인 아이디가 즉시 교체되고 새 이메일로 변경 통지가 발송됩니다.";

/**
 * 선택한 아이디 변경 요청 카드 (MSG-551 AC 13 — Figma 부재, 요청 카드 구조 답습).
 *
 * **상세 API가 없다** — 목록 항목이 상세 전체이므로 조회 분기(로딩·실패)가 없고,
 * 목록 로딩·실패는 좌측 카드가 소유한다.
 * 처리된 요청(승인됨·반려)은 읽기 전용이다 — 이미 처리 409(1428)를 조작 제거로 예방한다
 * (스펙 추정 13).
 */
export const EmailChangeDetailCard = ({
  selected,
  onApprove,
  onReject,
  isMutating,
  notice,
}: EmailChangeDetailCardProps) => (
  <section className="flex w-83 shrink-0 flex-col gap-md rounded-md bg-background p-lg shadow-raised">
    <h3 className="text-fm-title text-foreground">선택한 요청</h3>

    {selected === null ? (
      <p className="text-fm-body text-foreground-muted">
        행을 선택하면 요청 상세가 표시됩니다.
      </p>
    ) : (
      <>
        <dl className="flex flex-col gap-sm">
          <DetailField
            label="요청 기관"
            value={orgNameLabel(selected.orgName)}
          />
          <DetailField label="현재 아이디" value={selected.email} />
          <DetailField
            label="바꾸려는 이메일"
            value={selected.requestedEmail}
          />
          <DetailField
            label="요청일"
            value={formatKstReceiptTime(selected.createdAt)}
          />
        </dl>

        {selected.status === "PENDING" ? (
          <PendingActions
            approveText="승인"
            footnote={APPROVE_FOOTNOTE}
            isMutating={isMutating}
            onApprove={onApprove}
            onReject={onReject}
          />
        ) : (
          <ProcessedResult
            status={emailChangeStatusView(selected.status)}
            processedAt={selected.processedAt}
            rejectReason={selected.rejectReason}
          />
        )}
      </>
    )}

    <MutationNoticeText notice={notice} />
  </section>
);
