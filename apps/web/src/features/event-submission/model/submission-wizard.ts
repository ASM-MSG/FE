import type { SubmissionType } from "./submission-form";

/**
 * 행사 등록 위저드 스텝 전이 — 순수 로직 (MSG-546 AC 9·12).
 * 플랫폼 API(window·document·router)를 참조하지 않는다 — RN 재사용 대상
 * (features/upload/model/upload-wizard 선례).
 *
 * **이 파일의 `SubmissionStep`이 위저드 스텝의 정본이다** — 후속 티켓(MSG-547 위치 영역 ·
 * MSG-548 확인·제출 · MSG-550 재신청 수정 모드)은 유니언을 늘리지 않고 기존 스텝을 채운다.
 */

/** 위저드 스텝 — 유형 선택 → 기본 정보 → 위치 영역(MSG-547) → 확인·제출(MSG-548) */
export type SubmissionStep = "type" | "basic" | "area" | "review";

/** 스텝 순서 정본 — 진행 표시·"n / 4" 표기가 이 배열을 기준으로 파생된다 */
export const SUBMISSION_STEPS: readonly SubmissionStep[] = [
  "type",
  "basic",
  "area",
  "review",
];

/** 스텝 이름 (Figma 등록 절차 카드·본문 상단 표기 공용) */
export const SUBMISSION_STEP_LABELS: Record<SubmissionStep, string> = {
  type: "유형 선택",
  basic: "기본 정보",
  area: "위치 영역",
  review: "확인·제출",
};

/** 1-based 스텝 번호 */
const stepOrder = (step: SubmissionStep): number =>
  SUBMISSION_STEPS.indexOf(step) + 1;

/** 본문 상단 스텝 표시 — "2 / 4 기본 정보" (AC 9) */
export const stepIndicatorLabel = (step: SubmissionStep): string =>
  `${stepOrder(step)} / ${SUBMISSION_STEPS.length} ${SUBMISSION_STEP_LABELS[step]}`;

/** 진행 표시 항목 상태 — 완료(체크) · 현재(강조) · 대기 */
export type SubmissionStepState = "done" | "current" | "upcoming";

export interface SubmissionStepProgress {
  step: SubmissionStep;
  order: number;
  label: string;
  state: SubmissionStepState;
}

/**
 * 등록 절차 진행 표시를 파생한다 (AC 9) — 현재 스텝 이전은 완료, 이후는 대기.
 * 완료 스텝은 클릭으로 되돌아갈 수 있는 항목이다(유형 변경 진입로 — 추정 5).
 */
export const toStepProgress = (
  current: SubmissionStep,
): SubmissionStepProgress[] => {
  const currentOrder = stepOrder(current);
  return SUBMISSION_STEPS.map((step) => {
    const order = stepOrder(step);
    return {
      step,
      order,
      label: SUBMISSION_STEP_LABELS[step],
      state:
        order < currentOrder
          ? "done"
          : order === currentOrder
            ? "current"
            : "upcoming",
    };
  });
};

/**
 * 유형 스텝을 벗어날 수 있는가 (AC 1·2·5) — 유형이 확정돼야 하고,
 * EVENT는 소속 이벤트 회차(parentOccurrenceId)까지 확정돼야 한다(서버 EVENT 전용 필수).
 */
export const canLeaveTypeStep = ({
  type,
  parentOccurrenceId,
}: {
  type: SubmissionType | null;
  parentOccurrenceId: number | null;
}): boolean =>
  type !== null && (type !== "EVENT" || parentOccurrenceId !== null);
