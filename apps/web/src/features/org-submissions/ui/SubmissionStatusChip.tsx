import { cn } from "@fillmap/ui-web";
import {
  submissionStatusLabel,
  submissionStatusTone,
} from "../model/submission-status";

/**
 * SOURCE: Figma "[v2] [행사 운영자 2] 홈·신청 현황" (15525:8652) — 목록 행·요약 카드의
 * 상태 칩(연한 톤 배경 + 같은 계열 텍스트).
 *
 * ui-web `Chip`은 상호작용 필터 칩(button·aria-pressed·체크 아이콘)이라 상태 표시에 맞지
 * 않는다 — 여기는 클릭 대상이 아닌 정적 라벨이다. 신청 상태라는 콘솔 도메인을 아는
 * 컴포넌트라 ui-web이 아니라 features에 둔다(디자인 시스템 3조).
 * 목록과 요약 카드가 공유하며 MSG-549(신청 상세)가 재사용할 자산이다.
 *
 * 미지 status 값은 톤 없이 중립 배경 + 원문 라벨로 렌더된다 (AC 2, 추정 6).
 */
const TONE_CLASS = {
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  error: "bg-error/10 text-error",
} as const;

export const SubmissionStatusChip = ({ status }: { status: string }) => {
  const tone = submissionStatusTone(status);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-xs py-0.5 text-fm-label",
        tone === null ? "bg-surface text-foreground-body" : TONE_CLASS[tone],
      )}
    >
      {submissionStatusLabel(status)}
    </span>
  );
};
