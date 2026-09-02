import { CalendarDays } from "lucide-react";
import { Button, Chip, cn } from "@fillmap/ui-web";
import type { OrgSubmissionSummary } from "@/entities/org-submission/model/org-submission";
import { formatSubmissionPeriod } from "@/features/org-submissions/model/submission-format";
import {
  filterSubmissions,
  SUBMISSION_FILTERS,
  type SubmissionFilter,
} from "@/features/org-submissions/model/submission-status";
import { SubmissionStatusChip } from "@/features/org-submissions/ui/SubmissionStatusChip";

/**
 * SOURCE: Figma "[v2] [행사 운영자 2] 홈·신청 현황" (15525:8652) 좌측 "최근 신청" 카드 +
 * 빈 상태(15583:2398)의 같은 자리 변형.
 *
 * 목록은 서버 순서(최신 제출 순)를 그대로 쓰고 상태 필터만 클라이언트에서 적용한다 —
 * 응답에 페이지네이션이 없다(실측). 행 클릭은 상세 라우팅이라 페이지가 콜백으로 받는다.
 *
 * **시안의 "기간·영역" 중 영역 요약(위치 N곳·총 N칸)은 렌더하지 않는다** — 목록 API에
 * 위치 데이터가 없다(실측). 기간만 싣고, 서버 필드 추가를 환류 후보로 남긴다.
 */
const ROW_GRID = "grid grid-cols-[2fr_2fr_1fr] items-center gap-sm";

interface OrgRecentSubmissionsProps {
  /** 필터 적용 전 서버 순서의 원본 */
  submissions: OrgSubmissionSummary[];
  filter: SubmissionFilter;
  onFilterChange: (filter: SubmissionFilter) => void;
  onSelect: (submissionId: number) => void;
  onCreate: () => void;
  onOpenGuide: () => void;
}

export const OrgRecentSubmissions = ({
  submissions,
  filter,
  onFilterChange,
  onSelect,
  onCreate,
  onOpenGuide,
}: OrgRecentSubmissionsProps) => {
  const visible = filterSubmissions(submissions, filter);

  return (
    <section className="flex min-h-150 flex-1 flex-col gap-md rounded-sm border border-border bg-background p-lg">
      <h2 className="text-fm-heading text-foreground">최근 신청</h2>

      {submissions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-sm">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CalendarDays className="size-6" />
          </span>
          <p className="mt-xs text-fm-title text-foreground">
            아직 등록한 행사가 없어요
          </p>
          <p className="text-fm-body text-foreground-muted">
            행사를 등록하면 심사 진행 상황과 결과를 여기에서 확인할 수 있어요.
          </p>
          <Button
            text="첫 행사 등록하기"
            className="mt-md"
            onClick={onCreate}
          />
          <button
            type="button"
            onClick={onOpenGuide}
            className="text-fm-body-strong text-primary"
          >
            등록 가이드 보기
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-xs">
            {SUBMISSION_FILTERS.map(({ value, label }) => (
              <Chip
                key={value}
                text={label}
                active={value === filter}
                className={cn(value !== filter && "border border-border")}
                onClick={() => onFilterChange(value)}
              />
            ))}
          </div>

          <div className="flex flex-col">
            <div
              className={cn(
                ROW_GRID,
                "rounded-xs bg-surface px-sm py-xs text-fm-label text-foreground-body",
              )}
            >
              <span>행사명</span>
              <span>기간·영역</span>
              <span className="text-right">상태</span>
            </div>

            {visible.length === 0 ? (
              <p className="py-lg text-center text-fm-body text-foreground-muted">
                해당 상태의 신청이 없어요
              </p>
            ) : (
              <ul aria-label="최근 신청 목록" className="flex flex-col">
                {visible.map((submission) => (
                  <li key={submission.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(submission.id)}
                      className={cn(
                        ROW_GRID,
                        "w-full border-b border-border px-sm py-sm text-left transition-colors hover:bg-surface-soft",
                      )}
                    >
                      <span className="text-fm-base font-medium text-foreground">
                        {submission.title}
                      </span>
                      <span className="text-fm-body text-foreground-body">
                        {formatSubmissionPeriod(
                          submission.startsOn,
                          submission.endsOn,
                        )}
                      </span>
                      <span className="flex justify-end">
                        <SubmissionStatusChip status={submission.status} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-fm-body text-foreground-muted">
            승인된 행사는 기존 행사방 데이터로 들어가 일반 유저 지도에
            노출됩니다.
          </p>
        </>
      )}
    </section>
  );
};
