import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, RetryNotice, Skeleton } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useMySubmissionsQuery } from "@/features/org-submissions/api/use-my-submissions-query";
import { useSubmissionDetailQuery } from "@/features/org-submissions/api/use-submission-detail-query";
import { pickRepresentative } from "@/features/org-submissions/model/representative-submission";
import type { SubmissionFilter } from "@/features/org-submissions/model/submission-status";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { OrgHomeCountCards } from "./ui/OrgHomeCountCards";
import { OrgRecentSubmissions } from "./ui/OrgRecentSubmissions";
import { OrgSubmissionSummaryCard } from "./ui/OrgSubmissionSummaryCard";

/**
 * 운영자 홈 = 내 행사 신청 현황 대시보드 (MSG-545).
 * SOURCE: Figma "[v2] [행사 운영자 2] 홈·신청 현황" (15525:8652) · 빈 상태 (15583:2398).
 *
 * 목록 API 한 번(`useMySubmissionsQuery`)에서 카운트·목록·대표 신청을 전부 파생해 세 카드로
 * 분배하는 조립 층이다 — 상태 파생·표기·필터는 `features/org-submissions/model`(플랫폼 중립)이
 * 소유하고, 이 파일만 라우터를 안다.
 *
 * 상세 라우팅은 스텁으로의 이동만이다(상세 화면은 MSG-549, 위저드는 MSG-546~548).
 */
const submissionDetailPath = (submissionId: number): string =>
  CONSOLE_ROUTES.orgSubmissionDetail.replace(
    ":submissionId",
    String(submissionId),
  );

export const OrgHomePage = () => {
  useDocumentTitle(formatDocumentTitle("내 행사 신청"));
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SubmissionFilter>("ALL");

  const { data, isPending, isError, refetch } = useMySubmissionsQuery();
  const submissions = data?.submissions ?? [];
  const representative = pickRepresentative(submissions);
  // 반려 사유·이력은 상세 API에만 있어 대표가 반려일 때만 1건을 병행 조회한다 (추정 4)
  const detail = useSubmissionDetailQuery(
    representative?.status === "REJECTED" ? representative.id : null,
  );

  const goToWizard = () => navigate(CONSOLE_ROUTES.orgSubmissionNew);

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex items-start justify-between gap-lg">
        <div className="flex flex-col gap-xxs">
          <h1 className="text-fm-display text-foreground">내 행사 신청</h1>
          <p className="text-fm-body text-foreground-muted">
            {submissions.length === 0
              ? "등록한 행사의 심사 진행 상황과 결과를 확인하는 곳입니다."
              : "심사 결과와 반려 사유를 확인하고 필요한 경우 수정해 다시 제출하세요."}
          </p>
        </div>
        <Button text="+ 새 행사 등록" onClick={goToWizard} />
      </header>

      {isError ? (
        <RetryNotice
          message="신청 현황을 불러오지 못했어요"
          onRetry={() => void refetch()}
        />
      ) : isPending || data === undefined ? (
        <>
          <div className="grid grid-cols-4 gap-lg">
            {[0, 1, 2, 3].map((slot) => (
              <Skeleton key={slot} className="h-24 w-full rounded-sm" />
            ))}
          </div>
          <div className="flex gap-lg">
            <Skeleton className="h-150 flex-1 rounded-sm" />
            <Skeleton className="h-150 w-84 rounded-sm" />
          </div>
        </>
      ) : (
        <>
          <OrgHomeCountCards counts={data.counts} />
          <div className="flex gap-lg">
            <OrgRecentSubmissions
              submissions={submissions}
              filter={filter}
              onFilterChange={setFilter}
              onSelect={(submissionId) =>
                navigate(submissionDetailPath(submissionId))
              }
              onCreate={goToWizard}
              onOpenGuide={() => navigate(CONSOLE_ROUTES.orgGuide)}
            />
            <OrgSubmissionSummaryCard
              submission={representative}
              detail={detail}
              onOpenDetail={(submissionId) =>
                navigate(submissionDetailPath(submissionId))
              }
            />
          </div>
        </>
      )}
    </div>
  );
};
