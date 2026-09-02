import { cn } from "@fillmap/ui-web";
import type { OrgSubmissionStatusCounts } from "@/entities/org-submission/model/org-submission";
import { totalSubmissionCount } from "@/features/org-submissions/model/submission-status";

/**
 * SOURCE: Figma "[v2] [행사 운영자 2] 홈·신청 현황" (15525:8652) — 상태 카운트 카드 4종.
 *
 * 전체 신청은 응답에 필드가 없어 counts 3필드 합산이다 (AC 1, 추정 2).
 * 숫자 색은 시맨틱 토큰 그대로: 전체=본문 검정, 심사 중=warning, 승인됨=success,
 * 반려됨=error. 시안의 3/1/1/1은 디자인 예시 데이터라 하드코딩하지 않는다.
 */
export const OrgHomeCountCards = ({
  counts,
}: {
  counts: OrgSubmissionStatusCounts;
}) => {
  const cards = [
    {
      label: "전체 신청",
      value: totalSubmissionCount(counts),
      tone: "text-foreground",
    },
    { label: "심사 중", value: counts.inReview, tone: "text-warning" },
    { label: "승인됨", value: counts.approved, tone: "text-success" },
    { label: "반려됨", value: counts.rejected, tone: "text-error" },
  ];

  return (
    <dl className="grid grid-cols-4 gap-lg">
      {cards.map(({ label, value, tone }) => (
        <div
          key={label}
          className="rounded-sm border border-border bg-background px-md py-md"
        >
          <dt className="text-fm-body text-foreground-body">{label}</dt>
          <dd className={cn("mt-xs text-fm-display", tone)}>{value}</dd>
        </div>
      ))}
    </dl>
  );
};
