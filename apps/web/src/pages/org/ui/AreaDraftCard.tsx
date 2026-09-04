import { Button } from "@fillmap/ui-web";
import {
  addPreviewLabel,
  candidateIssueMessage,
  rectSizeLabel,
  type AreaCandidateJudgement,
  type AreaRect,
} from "@/features/event-submission/model/submission-area";

interface AreaDraftCardProps {
  /** 방금 드래그한 후보 사각형 — 단일 슬롯(새 드래그가 대체, 추정 7) */
  rect: AreaRect;
  judgement: AreaCandidateJudgement;
  onAdd: () => void;
  onCancel: () => void;
}

/**
 * "방금 드래그한 영역" 카드 (MSG-547 AC 2·4·5·7·8 — Figma 15525:9300).
 * 상한 초과면 추가를 막고 사유를 보이며, 한 변 초과는 경고만 하고 확정을 허용한다
 * (B안 확정 — 관리자 심사가 최종 판단). 판정은 순수 모델(submission-area) 몫이고
 * 이 카드는 그 결과를 보여주기만 한다.
 */
export const AreaDraftCard = ({
  rect,
  judgement,
  onAdd,
  onCancel,
}: AreaDraftCardProps) => {
  const issue = candidateIssueMessage(judgement);

  return (
    <section className="flex flex-col gap-xs rounded-md border border-primary bg-background p-md">
      <p className="text-fm-label text-primary">방금 드래그한 영역</p>
      <p className="text-fm-body-strong text-foreground">
        {rectSizeLabel(rect)}
      </p>
      <p className="text-fm-body text-foreground-muted">
        {addPreviewLabel(judgement.unionAfter)}
      </p>
      {issue !== null && (
        <p
          role="alert"
          className={
            judgement.blocked
              ? "text-fm-body text-error"
              : "text-fm-body text-warning"
          }
        >
          {issue}
        </p>
      )}
      <div className="flex items-center gap-xs">
        <Button
          text="+ 영역 추가"
          size="sm"
          disabled={judgement.blocked}
          onClick={onAdd}
        />
        <Button
          text="드래그 취소 · Esc"
          variant="secondary"
          size="sm"
          className="border border-border"
          onClick={onCancel}
        />
      </div>
    </section>
  );
};
