import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Selector } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useSubmitSubmission } from "@/features/event-submission/api/use-submit-submission";
import {
  SUBMISSION_FORM_CONFIGS,
  toCreateRequest,
} from "@/features/event-submission/model/submission-form";
import {
  reviewAreaSummary,
  reviewBasicRows,
  submitFailureNotice,
  type SubmissionReceiptState,
} from "@/features/event-submission/model/submission-review";
import {
  toDraftState,
  useSubmissionWizardStore,
} from "@/features/event-submission/model/submission-wizard-store";
import { stepIndicatorLabel } from "@/features/event-submission/model/submission-wizard";
import { revokeBlobPreviewUrl } from "./preview-url";
import { ReviewAreaCard } from "./ReviewAreaCard";
import { ReviewBasicCard } from "./ReviewBasicCard";
import { SubmitConfirmDialog } from "./SubmitConfirmDialog";

const SUBTITLE =
  "제출하면 운영팀 심사가 시작됩니다. 심사 중에는 내용을 수정할 수 없어요.";
const FACT_CHECK_LABEL = "입력한 내용이 사실과 다르지 않음을 확인합니다.";
const FOOTNOTE =
  "제출 후에는 「내 신청 목록」에서 심사 상태를 확인할 수 있습니다. 심사는 보통 1~2영업일이 걸립니다.";
const FACT_CHECK_ID = "submission-fact-check";

/**
 * 확인·제출 스텝 (MSG-548 — Figma 15644:2935) — 요약 2카드 + 사실 확인 + 확인 모달.
 * 위저드 스토어를 직접 구독하는 자급 컨테이너다(스위치가 prop 통로가 되지 않게 — 546 관례).
 *
 * 요약 파생·제출 본문 조립·실패 안내는 전부 순수 모델(`submission-review`·
 * `submission-form`)이 하고, 이 파일은 배선과 **뷰-레이어 결정 3가지**만 소유한다:
 * 사실 확인 체크(스텝 로컬 — 스텝을 떠나면 해제, 추정 4) · 모달 열림 · 성공 후 이동.
 *
 * 성공 처리 순서가 중요하다 (AC 9): blob 해제 → `reset()` → navigate.
 * 리셋을 먼저 해야 이탈 경고(WizardExitGuard)가 발화하지 않고, 미리보기 blob은 리셋으로
 * previewUrl이 지워지기 전에 놓아 준다(페이지 언마운트 cleanup이 볼 값이 이미 없다).
 */
export const ReviewStep = () => {
  const state = useSubmissionWizardStore();
  const navigate = useNavigate();
  const [factChecked, setFactChecked] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const submit = useSubmitSubmission({
    onSubmitted: ({ submissionNo }) => {
      revokeBlobPreviewUrl(
        useSubmissionWizardStore.getState().image.previewUrl,
      );
      state.reset();
      const receipt: SubmissionReceiptState = { submittedNo: submissionNo };
      navigate(CONSOLE_ROUTES.orgSubmissions, { state: receipt });
    },
  });

  if (state.type === null) return null;

  const config = SUBMISSION_FORM_CONFIGS[state.type];
  const draft = toDraftState(state);
  const request = toCreateRequest(draft);

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-start justify-between gap-md">
        <div className="flex flex-col gap-xxs">
          <p className="text-fm-label text-primary">
            {stepIndicatorLabel("review")}
          </p>
          <h2 className="text-fm-display text-foreground">신청 전 최종 검토</h2>
          <p className="text-fm-body text-foreground-muted">{SUBTITLE}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-fm-label text-primary">
          {config.badge}
        </span>
      </div>

      <div className="flex items-start gap-md">
        <ReviewBasicCard
          title={state.common.title}
          organizerName={state.common.organizerName}
          previewUrl={state.image.previewUrl}
          imageLabel={config.imageLabel}
          rows={reviewBasicRows(
            draft,
            config,
            state.parentOccurrence?.name ?? null,
          )}
          onEdit={() => state.goToStep("basic")}
        />
        <ReviewAreaCard
          summary={reviewAreaSummary(state.areaRects)}
          onEdit={() => state.goToStep("area")}
        />
      </div>

      <div className="flex items-center gap-sm border-t border-border pt-md">
        <Selector
          id={FACT_CHECK_ID}
          checked={factChecked}
          onCheckedChange={setFactChecked}
        />
        <label
          htmlFor={FACT_CHECK_ID}
          className="text-fm-body text-foreground-body"
        >
          {FACT_CHECK_LABEL}
        </label>
      </div>

      <div className="flex items-center justify-between gap-md">
        <Button
          text="이전"
          variant="secondary"
          className="border border-border"
          onClick={() => state.goToStep("area")}
        />
        <Button
          text="행사 등록 신청 제출"
          disabled={!factChecked || request === null}
          onClick={() => setIsDialogOpen(true)}
        />
      </div>

      <p className="text-fm-caption text-foreground-muted">{FOOTNOTE}</p>

      <SubmitConfirmDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isPending={submit.isPending}
        errorMessage={
          submit.error === null ? null : submitFailureNotice(submit.error)
        }
        onConfirm={() => {
          if (request === null) return;
          submit.mutate(request);
        }}
      />
    </div>
  );
};
