import { Check } from "lucide-react";
import type { SubmissionStep } from "@/features/event-submission/model/submission-wizard";
import { toStepProgress } from "@/features/event-submission/model/submission-wizard";

interface WizardProgressProps {
  current: SubmissionStep;
  /** 완료 스텝 클릭 = 그 스텝으로 복귀 — 유형 변경 진입로다 (추정 5) */
  onSelect: (step: SubmissionStep) => void;
  /**
   * 되돌아갈 수 없는 스텝 (MSG-550 AC 2) — 수정 모드의 "유형 선택"이 유일한 사용처다.
   * 완료 표시(체크)는 그대로 두고 **버튼을 만들지 않는다**: onSelect만 막으면 버튼이 남아
   * 클릭·포커스가 가능한 채 아무 일도 하지 않는 자리가 된다.
   */
  lockedSteps?: readonly SubmissionStep[];
}

/**
 * 등록 절차 진행 표시 (AC 9 — Figma 4A~C 좌하단 카드).
 * Figma는 콘솔 사이드바 하단에 두지만, 사이드바는 MSG-541 `widgets/console-shell`
 * 산출물이고 하단 슬롯이 없어 **위저드 페이지 본문 좌하단에 페이지 소유로 렌더한다**
 * (승인 확정 — 웨이브 1 병렬 안전 우선, 배치 차이는 Figma 오탐 방지에 등재됨).
 */
export const WizardProgress = ({
  current,
  onSelect,
  lockedSteps = [],
}: WizardProgressProps) => (
  <nav
    aria-label="등록 절차"
    className="w-64 rounded-md border border-border bg-background p-md"
  >
    <p className="text-fm-caption text-foreground-muted">등록 절차</p>
    <ol className="mt-xs flex flex-col gap-xs">
      {toStepProgress(current).map(({ step, order, label, state }) => (
        <li key={step}>
          {state === "done" && lockedSteps.includes(step) ? (
            <span className="flex items-center gap-xxs text-fm-label text-foreground-muted">
              <Check className="size-3" strokeWidth={3} />
              {label}
            </span>
          ) : state === "done" ? (
            <button
              type="button"
              onClick={() => onSelect(step)}
              className="flex items-center gap-xxs text-fm-label text-primary"
            >
              <Check className="size-3" strokeWidth={3} />
              {label}
            </button>
          ) : (
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={
                state === "current"
                  ? "text-fm-label text-foreground"
                  : "text-fm-label text-foreground-muted"
              }
            >
              {order} {label}
            </span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);
