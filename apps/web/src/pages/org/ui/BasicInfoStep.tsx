import type { ReactNode } from "react";
import { Button, Input } from "@fillmap/ui-web";
import { useKstToday } from "@/features/event/model/use-kst-today";
import {
  isBasicStepComplete,
  periodIssueMessage,
  SUBMISSION_FORM_CONFIGS,
} from "@/features/event-submission/model/submission-form";
import {
  toDraftState,
  useSubmissionWizardStore,
} from "@/features/event-submission/model/submission-wizard-store";
import { stepIndicatorLabel } from "@/features/event-submission/model/submission-wizard";
import { SubmissionImageField } from "./SubmissionImageField";

const SUBTITLE =
  "선택한 유형에 필요한 정보만 입력합니다. 위치 영역은 다음 단계에서 지정합니다.";

/** 라벨 + 입력 한 칸 */
const Field = ({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-xs">
    <label htmlFor={id} className="text-fm-label text-foreground-body">
      {label}
    </label>
    {children}
  </div>
);

/**
 * 기본 정보 스텝 (AC 6·9·10·11 — Figma 4A 15525:8725 · 4B 15525:10251 · 4C 15525:10316).
 * **유형 분기는 컴포넌트가 아니라 설정 객체 3벌**(`SUBMISSION_FORM_CONFIGS`)이 표현한다 —
 * 라벨·CTA·각주가 유형별로 갈리고, 유형 전용 필드는 선택 유형의 것 하나만 렌더한다
 * (다른 유형 필드 미렌더 = 서버 13439 예방).
 * 유형 선택 전에는 렌더되지 않는다(스위치가 유형 확정 후에만 이 스텝으로 보낸다).
 *
 * 기간은 시안의 범위 한 칸 대신 네이티브 date input 2개다(추정 6) — 레포에 데이트피커가
 * 없고 DTO의 KST 날짜 문자열과 직결된다.
 * 선택한 소속 이벤트는 4C 시안에 표시가 없어 렌더하지 않는다(추정 9 — 보관만).
 */
export const BasicInfoStep = () => {
  const state = useSubmissionWizardStore();
  const todayKst = useKstToday();

  if (state.type === null) return null;

  const config = SUBMISSION_FORM_CONFIGS[state.type];
  const draft = toDraftState(state);
  const periodIssue = periodIssueMessage(state.common, todayKst);
  const canProceed = isBasicStepComplete(draft) && periodIssue === null;

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-start justify-between gap-md">
        <h2 className="text-fm-display text-foreground">{config.heading}</h2>
        <div className="flex items-center gap-sm">
          <span className="text-fm-label text-foreground-muted">
            {stepIndicatorLabel("basic")}
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-fm-label text-primary">
            {config.badge}
          </span>
        </div>
      </div>
      <p className="text-fm-body text-foreground-muted">{SUBTITLE}</p>

      <section className="flex flex-col gap-lg rounded-md border border-border bg-background p-lg">
        <div className="grid grid-cols-2 gap-lg">
          <Field id="submission-title" label={config.titleLabel}>
            <Input
              id="submission-title"
              value={state.common.title}
              onChange={(event) =>
                state.setCommonField("title", event.target.value)
              }
              className="border-border"
            />
          </Field>
          <Field id="submission-organizer" label={config.organizerLabel}>
            <Input
              id="submission-organizer"
              value={state.common.organizerName}
              onChange={(event) =>
                state.setCommonField("organizerName", event.target.value)
              }
              className="border-border"
            />
          </Field>

          <div className="flex flex-col gap-xs">
            <p className="text-fm-label text-foreground-body">
              {config.periodLabel}
            </p>
            <div className="flex items-center gap-xs">
              <Input
                type="date"
                aria-label={`${config.periodLabel} 시작일`}
                value={state.common.startsOn}
                onChange={(event) =>
                  state.setCommonField("startsOn", event.target.value)
                }
                className="border-border"
              />
              <span className="text-fm-body text-foreground-muted">–</span>
              <Input
                type="date"
                aria-label={`${config.periodLabel} 종료일`}
                value={state.common.endsOn}
                onChange={(event) =>
                  state.setCommonField("endsOn", event.target.value)
                }
                className="border-border"
              />
            </div>
            {periodIssue !== null && (
              <p role="alert" className="text-fm-body text-error">
                {periodIssue}
              </p>
            )}
          </div>

          <Field id="submission-type-field" label={config.typeFieldLabel}>
            <Input
              id="submission-type-field"
              value={state.typeFieldValues[state.type]}
              onChange={(event) => state.setTypeFieldValue(event.target.value)}
              className="border-border"
            />
          </Field>
        </div>

        <Field id="submission-description" label={config.descriptionLabel}>
          {/* ui-web에 Textarea가 없다 — 멀티라인은 페이지 로컬 요소로 둔다(RouteInputCard 선례) */}
          <textarea
            id="submission-description"
            rows={4}
            value={state.common.description}
            onChange={(event) =>
              state.setCommonField("description", event.target.value)
            }
            className="w-full resize-none rounded-md border border-border bg-background p-md text-fm-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary"
          />
        </Field>

        <SubmissionImageField label={config.imageLabel} />

        <div className="flex justify-end">
          <Button
            text={config.ctaLabel}
            disabled={!canProceed}
            onClick={() => state.goToStep("area")}
          />
        </div>
      </section>

      <p className="text-fm-caption text-foreground-muted">{config.footnote}</p>
    </div>
  );
};
