import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, RetryNotice, Skeleton, Toast } from "@fillmap/ui-web";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import {
  readSubmittedNo,
  submissionReceiptToast,
} from "@/features/event-submission/model/submission-review";
import { useAutoDismissToast } from "@/features/video-actions/model/use-auto-dismiss-toast";
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

/**
 * 접수 안내가 스스로 사라지는 시간 (MSG-548 AC 10) — 신청 번호 + 심사 소요 2줄을 읽을
 * 여유를 둔다(계정 설정의 완료 안내 5초보다 문구가 길다).
 */
const RECEIPT_NOTICE_DURATION_MS = 6_000;

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
  const { pathname, state } = useLocation();
  const [filter, setFilter] = useState<SubmissionFilter>("ALL");
  const [receiptNo, setReceiptNo] = useAutoDismissToast(
    RECEIPT_NOTICE_DURATION_MS,
  );

  // 제출 성공 직후 위저드가 넘긴 신청 번호를 1회 안내한다 (MSG-548 AC 10) — 콘솔에 전역
  // 토스트 호스트가 없어 목적지 페이지가 그린다(MSG-544 페이지 소유 Toast 선례).
  // 표시 후 history state를 비워 새로고침·뒤로가기 재방문에서 반복되지 않게 한다.
  //
  // **ref 가드는 필수다**(실측 — 없으면 무한 렌더로 워커가 OOM으로 죽는다): 토스트 설정은
  // 매번 새 참조를 만들고 setter가 렌더마다 새로 생겨 이 이펙트가 매 렌더 실행되는데,
  // 라우터의 state 비우기는 transition으로 커밋된다 — 급한 setState가 계속 끼어들면
  // transition이 영원히 밀려 state가 비워지지 않는다. 번호당 1회로 잠가 그 고리를 끊는다.
  const announcedNoRef = useRef<string | null>(null);
  useEffect(() => {
    const submittedNo = readSubmittedNo(state);
    if (submittedNo === null || announcedNoRef.current === submittedNo) return;
    announcedNoRef.current = submittedNo;
    setReceiptNo(submittedNo);
    navigate(pathname, { replace: true, state: null });
  }, [state, pathname, navigate, setReceiptNo]);

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

      {receiptNo !== null && (
        <Toast variant="light" {...submissionReceiptToast(receiptNo)} />
      )}

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
