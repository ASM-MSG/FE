import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import {
  continueWithLabel,
  SUBMISSION_TYPE_CARDS,
  SUBMISSION_TYPE_LABELS,
  type SubmissionType,
} from "@/features/event-submission/model/submission-form";
import { useSubmissionWizardStore } from "@/features/event-submission/model/submission-wizard-store";
import {
  canLeaveTypeStep,
  stepIndicatorLabel,
} from "@/features/event-submission/model/submission-wizard";
import { EventParentModal } from "./EventParentModal";
import { TypeCard } from "./TypeCard";

const NOTICE_TITLE = "선택 후에도 기본 정보 단계에서 유형을 바꿀 수 있습니다.";
const NOTICE_BODY =
  "위치 영역을 지정한 뒤 유형을 변경하면 입력 내용과 지도 선택이 초기화됩니다.";

/**
 * 유형 선택 스텝 (AC 1·2·3·5 — Figma 15525:8851).
 * 지역축제·팝업스토어는 카드 선택만으로 진행할 수 있고, 이벤트는 소속 이벤트 선택 모달을
 * 열어 확정해야 진행된다(모달 확정 = 즉시 기본 정보 스텝 — 추정 3).
 * 모달을 취소하면 유형 확정 없이 닫히므로 계속 버튼은 비활성으로 남는다.
 * 조립 전용 뷰 컴포넌트라 라우터를 직접 참조한다(취소 = 운영자 홈 복귀 — 추정 7).
 */
export const TypeSelectStep = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const type = useSubmissionWizardStore((state) => state.type);
  const parentOccurrence = useSubmissionWizardStore(
    (state) => state.parentOccurrence,
  );
  const selectType = useSubmissionWizardStore((state) => state.selectType);
  const goToStep = useSubmissionWizardStore((state) => state.goToStep);
  const confirmEventParent = useSubmissionWizardStore(
    (state) => state.confirmEventParent,
  );

  const handleSelect = (next: SubmissionType) => {
    // 이벤트는 모달 확정에서만 유형이 확정된다 — 카드 클릭은 모달을 열 뿐이다 (추정 3)
    if (next === "EVENT") {
      setModalOpen(true);
      return;
    }
    selectType(next);
  };

  const canContinue = canLeaveTypeStep({
    type,
    parentOccurrenceId: parentOccurrence?.occurrenceId ?? null,
  });

  return (
    <div className="flex flex-col gap-md">
      <p className="text-fm-label text-primary">{stepIndicatorLabel("type")}</p>
      <h2 className="text-fm-display text-foreground">
        어떤 형태를 등록하시나요?
      </h2>
      <p className="text-fm-body text-foreground-muted">
        운영 목적에 맞는 유형을 선택하면 필요한 입력 항목만 보여드립니다.
      </p>

      <div
        role="radiogroup"
        aria-label="등록 유형"
        className="grid grid-cols-3 gap-md"
      >
        {SUBMISSION_TYPE_CARDS.map((card) => (
          <TypeCard
            key={card.type}
            card={card}
            selected={
              card.type === type || (modalOpen && card.type === "EVENT")
            }
            onSelect={() => handleSelect(card.type)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-xxs rounded-md bg-primary/5 p-md">
        <p className="text-fm-body-strong text-foreground">{NOTICE_TITLE}</p>
        <p className="text-fm-body text-foreground-muted">{NOTICE_BODY}</p>
      </div>

      <div className="flex items-center justify-between gap-md">
        <Button
          text="취소"
          variant="secondary"
          onClick={() => navigate(CONSOLE_ROUTES.orgHome)}
          className="border border-border"
        />
        <Button
          text={
            type === null
              ? "계속"
              : continueWithLabel(SUBMISSION_TYPE_LABELS[type])
          }
          disabled={!canContinue}
          onClick={() => goToStep("basic")}
        />
      </div>
      {type !== null && (
        <p className="text-fm-caption text-foreground-muted">
          선택한 유형: {SUBMISSION_TYPE_LABELS[type]}
        </p>
      )}

      {modalOpen && (
        <EventParentModal
          open
          onClose={() => setModalOpen(false)}
          onConfirm={(parent) => {
            setModalOpen(false);
            confirmEventParent(parent);
          }}
          initialOccurrenceId={parentOccurrence?.occurrenceId ?? null}
        />
      )}
    </div>
  );
};
