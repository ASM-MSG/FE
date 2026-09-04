import type { SubmissionStep } from "@/features/event-submission/model/submission-wizard";
import {
  stepIndicatorLabel,
  SUBMISSION_STEP_LABELS,
} from "@/features/event-submission/model/submission-wizard";
import { AreaStep } from "./AreaStep";
import { BasicInfoStep } from "./BasicInfoStep";
import { TypeSelectStep } from "./TypeSelectStep";

/** 후속 티켓이 채울 스텝의 자리표시 — 현재 스텝 표시만 유지한다 */
const StepPlaceholder = ({ step }: { step: SubmissionStep }) => (
  <div className="flex flex-col gap-xs">
    <p className="text-fm-label text-primary">{stepIndicatorLabel(step)}</p>
    <h2 className="text-fm-display text-foreground">
      {SUBMISSION_STEP_LABELS[step]}
    </h2>
    <p className="text-fm-body text-foreground-muted">
      이 단계는 준비 중입니다.
    </p>
  </div>
);

/**
 * 위저드 스텝 본문 스위치 (AC 12) — **본문 분기 렌더는 이 한 파일에 모인다**
 * (MSG-516 EventRoomBodySwitch 확장점 패턴). 후속 티켓은 자기 case만 실 본문으로 교체한다:
 * - MSG-547(완료): area → 위치 영역 지정(지도 + 영역 사각형)
 * - MSG-548: review → 확인·제출
 * - MSG-550: 수정 모드(`/org/submissions/:submissionId/edit`)는 스텝 구성을 그대로 쓰고
 *   스토어에 mode·초기값을 얹는다 — 이 스위치의 분기는 늘지 않는다
 *
 * 각 스텝 컴포넌트는 위저드 스토어를 직접 구독하는 자급 컨테이너다(EventRoomOverview 선례)
 * — 스위치가 prop 통로가 되지 않게 해 후속 확장이 한두 줄로 끝난다.
 */
export const WizardStepSwitch = ({ step }: { step: SubmissionStep }) => {
  switch (step) {
    case "type":
      return <TypeSelectStep />;
    case "basic":
      return <BasicInfoStep />;
    case "area":
      return <AreaStep />;
    case "review":
      return <StepPlaceholder step="review" />;
  }
};
