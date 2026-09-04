import { Button } from "@fillmap/ui-web";
import type { DecisionErrorView } from "@/features/admin-review/model/review-decision";

interface ReviewDecisionActionsProps {
  /** `canSubmitReject` 판정 결과 — 미충족이면 반려 버튼이 비활성이다 (AC 9, 추정 13) */
  canReject: boolean;
  /** 승인·반려 중 하나라도 진행 중이면 두 버튼 모두 잠근다 (추정 12) */
  isPending: boolean;
  /** 확정 실패 안내 — 있으면 화면을 유지한 채 보여 준다 (AC 11) */
  notice: DecisionErrorView | null;
  onReject: () => void;
  onApproveClick: () => void;
  onBackToQueue: () => void;
}

/** 상시 고지 각주 (승인 질문 8) — 시안의 "승인 시 event-occurrence 생성"을 한글로 대체 */
const FOOTNOTE = "승인하면 행사 데이터가 생성되어 유저 지도에 즉시 노출됩니다.";

/**
 * 확정 조작 행 (AC 5·8·9·11) — 반려(테두리 error) + 승인(primary) + 실패 안내 + 각주.
 *
 * 실패 안내는 `role="alert"`이고 에러 색이다(MSG-551 리뷰 반영 — 성공과 시각 분리).
 * 13450·13430처럼 재시도가 무의미한 분기는 재시도 버튼 대신 큐 복귀 버튼을 낸다.
 */
export const ReviewDecisionActions = ({
  canReject,
  isPending,
  notice,
  onReject,
  onApproveClick,
  onBackToQueue,
}: ReviewDecisionActionsProps) => (
  <div className="flex flex-col gap-sm">
    {notice !== null && (
      <div className="flex flex-col gap-xs">
        <p role="alert" className="text-fm-caption text-error">
          {notice.message}
        </p>
        {notice.nextStep === "backToQueue" && (
          <Button
            text="심사 큐로 돌아가기"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={onBackToQueue}
          />
        )}
      </div>
    )}
    <div className="flex gap-sm">
      <Button
        text="반려"
        variant="secondary"
        className="flex-1 border border-error text-error"
        disabled={!canReject || isPending}
        onClick={onReject}
      />
      <Button
        text="승인·지도 노출"
        className="flex-1"
        // `nextStep: "none"`(13451 종료일 경과)은 승인이 **영구 불가**라는 판정이다 —
        // 버튼을 열어 두면 관리자가 확실히 실패하는 요청을 반복해 보낸다. 반려는
        // 여전히 유효한 조작이라 잠그지 않는다 (codex 2R P2)
        disabled={isPending || notice?.nextStep === "none"}
        onClick={onApproveClick}
      />
    </div>
    <p className="text-fm-caption text-foreground-muted">{FOOTNOTE}</p>
  </div>
);
