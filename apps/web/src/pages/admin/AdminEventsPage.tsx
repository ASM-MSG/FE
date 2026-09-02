import { useState } from "react";
import { RetryNotice, Skeleton } from "@fillmap/ui-web";
import { useAdminEventDetailQuery } from "@/features/admin-events/api/use-admin-event-detail-query";
import { useAdminEventsQuery } from "@/features/admin-events/api/use-admin-events-query";
import { useUnpublishEvent } from "@/features/admin-events/api/use-unpublish-event";
import {
  type ApprovedEventStatus,
  EMAIL_FAILED_NOTICE,
  approvedEventTabText,
  approvedEventTabViews,
  exposureCenter,
} from "@/features/admin-events/model/approved-event";
import { formatDocumentTitle } from "@/shared/document-title";
import { buildMapFocusPath } from "@/shared/map-focus-link";
import { openInNewTab } from "@/shared/navigation";
import { useDocumentTitle } from "@/shared/use-document-title";
import { AdminEventsTable } from "./events/AdminEventsTable";
import { EventStatusTabs } from "./events/EventStatusTabs";
import { SelectedEventCard } from "./events/SelectedEventCard";
import { UnpublishDialog } from "./events/UnpublishDialog";

const PAGE_TITLE = "승인 행사 관리";
const PAGE_DESCRIPTION =
  "지도에 노출 중인 승인 행사를 확인하고, 문제가 있으면 노출을 중지합니다.";

/**
 * 승인 행사 관리 (MSG-554, Figma 15579:2378) — 상태 탭 + 목록 테이블 + 선택 상세 카드.
 * 콘솔 셸(MSG-541)의 본문으로 렌더되므로 셸·가드·라우트는 건드리지 않는다.
 *
 * 상태 4개만 소유한다: 탭 status / 선택 행 / 모달 열림 / 실패·메일 안내.
 * 탭을 바꾸면 선택을 해제한다 — 선택 행이 새 탭 목록에 없을 수 있다(스펙 추정 8).
 * 목록·상세 조회와 파생은 `features/admin-events`가 소유하고 여기서는 조립만 한다.
 */
export const AdminEventsPage = () => {
  useDocumentTitle(formatDocumentTitle(PAGE_TITLE));

  const [status, setStatus] = useState<ApprovedEventStatus>("EXPOSED");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const list = useAdminEventsQuery(status);
  const detail = useAdminEventDetailQuery(selectedId);
  const events = list.data?.events ?? [];
  const selected =
    events.find((event) => event.submissionId === selectedId) ?? null;
  const tabText = approvedEventTabText(status);

  const unpublish = useUnpublishEvent({
    onUnpublished: (result) => {
      setDialogOpen(false);
      setFailureMessage(null);
      setEmailNotice(result.emailSent ? null : EMAIL_FAILED_NOTICE);
    },
    onFailed: (notice) => setFailureMessage(notice.message),
  });

  const handleTabSelect = (next: ApprovedEventStatus) => {
    setStatus(next);
    setSelectedId(null);
    setEmailNotice(null);
  };

  const handleRowSelect = (submissionId: number) => {
    setSelectedId(submissionId);
    setEmailNotice(null);
  };

  const handleShowOnMap = () => {
    if (detail.detail === null) return;
    openInNewTab(buildMapFocusPath(exposureCenter(detail.detail.exposureRect)));
  };

  const handleUnpublishClick = () => {
    setFailureMessage(null);
    setDialogOpen(true);
  };

  const handleConfirmUnpublish = (reason: string) => {
    if (selectedId === null) return;
    unpublish.mutate({ submissionId: selectedId, reason });
  };

  return (
    <div className="flex min-h-full flex-col gap-lg">
      <header className="flex flex-col gap-2.5">
        <h1 className="text-fm-display text-foreground">{PAGE_TITLE}</h1>
        <p className="text-fm-label text-foreground-muted">
          {PAGE_DESCRIPTION}
        </p>
      </header>

      <EventStatusTabs
        views={approvedEventTabViews(list.data)}
        activeStatus={status}
        onSelect={handleTabSelect}
      />

      <div className="flex flex-1 items-start gap-lg">
        <section className="flex min-w-0 flex-1 flex-col gap-md rounded-md bg-background p-lg shadow-raised">
          <h2 className="text-fm-title text-foreground">{tabText.listTitle}</h2>
          {list.isError ? (
            <RetryNotice
              message="승인 행사 목록을 불러오지 못했어요"
              onRetry={list.retry}
            />
          ) : list.isPending ? (
            // 테이블 자리 한 덩어리 — 행 수를 모르는 로딩에서 행 모양을 흉내내지 않는다
            <Skeleton className="h-50 w-full rounded-sm" />
          ) : events.length === 0 ? (
            <p className="text-fm-body text-foreground-muted">
              {tabText.emptyMessage}
            </p>
          ) : (
            <AdminEventsTable
              events={events}
              selectedId={selectedId}
              onSelect={handleRowSelect}
            />
          )}
        </section>

        <SelectedEventCard
          selected={selected}
          detail={detail.detail}
          isPending={detail.isPending}
          isError={detail.isError}
          onRetry={detail.retry}
          onShowOnMap={handleShowOnMap}
          onUnpublish={handleUnpublishClick}
          notice={emailNotice}
        />
      </div>

      <UnpublishDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        eventTitle={selected?.title ?? ""}
        isPending={unpublish.isPending}
        errorMessage={failureMessage}
        onConfirm={handleConfirmUnpublish}
      />
    </div>
  );
};
