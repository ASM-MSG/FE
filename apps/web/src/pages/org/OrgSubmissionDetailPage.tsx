import { useNavigate, useParams } from "react-router-dom";
import { Button, RetryNotice, Skeleton } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import { useSubmissionDetailQuery } from "@/features/org-submissions/api/use-submission-detail-query";
import { parseSubmissionId } from "@/features/org-submissions/model/submission-detail-view";
import { isOrgSubmissionStatus } from "@/features/org-submissions/model/submission-status";
import { SubmissionStatusChip } from "@/features/org-submissions/ui/SubmissionStatusChip";
import { formatDocumentTitle } from "@/shared/document-title";
import { useDocumentTitle } from "@/shared/use-document-title";
import { SubmissionInfoSection } from "./ui/SubmissionInfoSection";
import { SubmissionResultCard } from "./ui/SubmissionResultCard";
import { SubmissionStatusBanner } from "./ui/SubmissionStatusBanner";

/**
 * 심사 결과 상세 (MSG-549) — SOURCE: Figma 심사 중(15525:8923) · 승인(15525:8967) ·
 * 반려(15525:9011).
 *
 * 상세 API 하나(`useSubmissionDetailQuery` — MSG-545 자산 재사용)로 상태별 3분기 배너·결과
 * 카드와 공통 섹션(기본 정보·위치 요약·이력)을 구성한다. 상태 판정은 가드(`isOrgSubmissionStatus`)를
 * 지나며, 서버가 새 상태를 내려도 배너·결과 카드 없이 공통 섹션으로 수렴한다 (AC 11).
 *
 * 경로 파라미터가 숫자가 아니면 훅에 null을 주어 **요청을 발사하지 않고** 오류 안내를
 * 보여준다 (AC 10 — 훅의 null 게이트 재사용).
 */
const DetailSkeleton = () => (
  <div className="flex flex-col gap-md">
    <p role="status" className="sr-only">
      신청 상세를 불러오는 중
    </p>
    <Skeleton className="h-24 w-full rounded-sm" />
    <Skeleton className="h-60 w-full rounded-sm" />
  </div>
);

export const OrgSubmissionDetailPage = () => {
  useDocumentTitle(formatDocumentTitle("심사 결과"));
  const navigate = useNavigate();
  const { submissionId } = useParams<{ submissionId: string }>();
  const parsedId = parseSubmissionId(submissionId);

  const { detail, isPending, isError, retry } =
    useSubmissionDetailQuery(parsedId);
  const status = detail?.status ?? null;

  const goToList = () => navigate(CONSOLE_ROUTES.orgSubmissions);

  return (
    <div className="flex flex-col gap-lg">
      <header className="flex items-start justify-between gap-lg">
        <div className="flex flex-col gap-xxs">
          <h1 className="text-fm-display text-foreground">심사 결과</h1>
          {detail !== null && (
            <p className="text-fm-body text-foreground-muted">{detail.title}</p>
          )}
        </div>
        {status !== null && <SubmissionStatusChip status={status} />}
      </header>

      {parsedId === null ? (
        // 재시도할 요청이 없는 실패라 RetryNotice가 아니라 목록 복귀 안내다 (AC 10)
        <div className="flex items-center justify-between gap-sm py-xs">
          <p className="text-fm-body text-foreground-muted">
            잘못된 신청 번호로 들어왔어요
          </p>
          <Button
            text="목록으로 돌아가기"
            variant="secondary"
            size="sm"
            onClick={goToList}
          />
        </div>
      ) : isError ? (
        <RetryNotice message="신청 상세를 불러오지 못했어요" onRetry={retry} />
      ) : isPending || detail === null ? (
        <DetailSkeleton />
      ) : (
        <>
          {isOrgSubmissionStatus(detail.status) && (
            <>
              <SubmissionStatusBanner status={detail.status} />
              <SubmissionResultCard
                detail={detail}
                status={detail.status}
                onBackToList={goToList}
                onReapply={() =>
                  navigate(
                    CONSOLE_ROUTES.orgSubmissionEdit.replace(
                      ":submissionId",
                      String(detail.id),
                    ),
                  )
                }
              />
            </>
          )}
          <SubmissionInfoSection detail={detail} />
        </>
      )}
    </div>
  );
};
