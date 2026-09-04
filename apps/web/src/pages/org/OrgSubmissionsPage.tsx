import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, RetryNotice, Skeleton } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useMySubmissionsQuery } from "@/features/org-submissions/api/use-my-submissions-query";
import {
  filterSubmissions,
  submissionCountsSummary,
  type SubmissionFilter,
} from "@/features/org-submissions/model/submission-status";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { SubmissionFilterPills } from "./ui/SubmissionFilterPills";
import { SubmissionListCard } from "./ui/SubmissionListCard";

/**
 * 내 신청 목록 (MSG-549) — SOURCE: Figma "[v2] [행사 운영자 2] 내 신청 목록" (15525:9602).
 *
 * 홈 대시보드(MSG-545)와 같은 목록 API 하나(`useMySubmissionsQuery`)를 재사용해 부제 요약·
 * 행·필터를 전부 파생한다. 페이지네이션이 없어(실측) 상태 필터는 클라이언트 처리다.
 * 이 파일만 라우터를 알고, 표기·필터·요약은 `features/org-submissions/model`이 소유한다.
 */
const submissionPath = (route: string, submissionId: number): string =>
  route.replace(":submissionId", String(submissionId));

const ListSkeleton = () => (
  <div className="flex flex-col gap-sm">
    <p role="status" className="sr-only">
      신청 목록을 불러오는 중
    </p>
    {[0, 1, 2].map((row) => (
      <Skeleton key={row} className="h-20 w-full rounded-sm" />
    ))}
  </div>
);

export const OrgSubmissionsPage = () => {
  useDocumentTitle(formatDocumentTitle("내 신청 목록"));
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SubmissionFilter>("ALL");

  const { data, isPending, isError, refetch } = useMySubmissionsQuery();
  const submissions = data?.submissions ?? [];
  const visible = filterSubmissions(submissions, filter);

  const goToWizard = () => navigate(CONSOLE_ROUTES.orgSubmissionNew);
  const openDetail = (submissionId: number) =>
    navigate(submissionPath(CONSOLE_ROUTES.orgSubmissionDetail, submissionId));

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex items-start justify-between gap-lg">
        <div className="flex flex-col gap-xxs">
          <h1 className="text-fm-display text-foreground">내 신청 목록</h1>
          <p className="text-fm-body text-foreground-muted">
            {data === undefined
              ? "제출한 행사 신청의 심사 상태를 한자리에서 확인하세요."
              : submissionCountsSummary(data.counts)}
          </p>
        </div>
        <Button text="+ 새 행사 등록" onClick={goToWizard} />
      </header>

      {isError ? (
        <RetryNotice
          message="신청 목록을 불러오지 못했어요"
          onRetry={() => void refetch()}
        />
      ) : isPending || data === undefined ? (
        <ListSkeleton />
      ) : submissions.length === 0 ? (
        <section className="flex flex-col items-center gap-sm rounded-sm border border-border bg-background p-xxl">
          <p className="text-fm-title text-foreground">
            아직 등록한 행사가 없어요
          </p>
          <p className="text-fm-body text-foreground-muted">
            행사를 등록하면 심사 진행 상황과 결과를 여기에서 확인할 수 있어요.
          </p>
          <Button
            text="첫 행사 등록하기"
            className="mt-md"
            onClick={goToWizard}
          />
        </section>
      ) : (
        <>
          <div className="flex items-center justify-between gap-md">
            <SubmissionFilterPills filter={filter} onChange={setFilter} />
            <span className="text-fm-body text-foreground-muted">
              최근 신청순
            </span>
          </div>

          {visible.length === 0 ? (
            <p className="py-xxl text-center text-fm-body text-foreground-muted">
              해당 상태의 신청이 없어요
            </p>
          ) : (
            <ul aria-label="내 신청 목록" className="flex flex-col gap-sm">
              {visible.map((submission, index) => (
                <SubmissionListCard
                  key={submission.id}
                  submission={submission}
                  position={index + 1}
                  onOpenDetail={openDetail}
                  onReapply={(submissionId) =>
                    navigate(
                      submissionPath(
                        CONSOLE_ROUTES.orgSubmissionEdit,
                        submissionId,
                      ),
                    )
                  }
                />
              ))}
            </ul>
          )}

          <p className="text-fm-body text-foreground-muted">
            승인된 행사는 기존 행사방 데이터로 들어가 일반 유저 지도에
            노출됩니다.
          </p>
        </>
      )}
    </div>
  );
};
