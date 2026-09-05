import type { SubmissionEditContext } from "@/features/event-submission/model/submission-wizard-store";
import { rejectionReasonLabels } from "@/features/org-submissions/model/rejection-reason";

/**
 * SOURCE: Figma 반려 후 수정(15525:8787)의 상단 반려 사유 카드 — 빨간 라벨 "반려 사유" +
 * 항목 라벨 행 + 사유 본문.
 *
 * 무엇을 고쳐야 하는지 수정 화면에 붙여 두는 자리다 (MSG-550 AC 3). 항목 라벨은
 * `rejectionReasonLabels`(MSG-549 자산)가 정본이고 미지 코드는 원문으로 남는다.
 * 위치 영역 스텝(전면 지도)에서는 페이지가 이 배너를 렌더하지 않는다 (추정 3).
 *
 * 다중 위치 신청은 첫 위치만 프리필되므로(승인 확정) 그 소실을 같은 카드에서 고지한다 —
 * 사용자가 재제출 전에 알아야 하는 사실이 한 자리에 모인다.
 */
const DROPPED_LOCATIONS_NOTICE = "재제출 시 첫 번째 위치만 유지됩니다.";

export const RejectionNoticeBanner = ({
  rejection,
  droppedLocations,
}: Pick<SubmissionEditContext, "rejection" | "droppedLocations">) => {
  // 반려 사유는 계약상 채워지지만 응답 타입이 nullable이다 — 알릴 것이 없으면 카드를 만들지 않는다
  if (rejection === null && !droppedLocations) return null;

  return (
    <section
      aria-label="반려 사유 안내"
      className="flex flex-col gap-xxs rounded-sm border border-error/30 bg-error/10 p-lg"
    >
      <p className="text-fm-label text-error">반려 사유</p>
      {rejection !== null && (
        <>
          <p className="text-fm-title text-foreground">
            {rejectionReasonLabels(rejection.reasonCodes)}
          </p>
          <p className="text-fm-body text-foreground-body">
            {rejection.reasonText}
          </p>
        </>
      )}
      {droppedLocations && (
        <p className="text-fm-caption text-foreground-muted">
          {DROPPED_LOCATIONS_NOTICE}
        </p>
      )}
    </section>
  );
};
