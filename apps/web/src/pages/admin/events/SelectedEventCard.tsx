import { Button, RetryNotice, Skeleton, Thumbnail } from "@fillmap/ui-web";
import {
  approvedDateLabel,
  eventStatusBadge,
  exposureSummary,
  formatCardDate,
  formatCardPeriod,
} from "@/features/admin-events/model/approved-event";
import type {
  AdminApprovedEventItemResponseDto,
  AdminEventSubmissionDetailResponseDto,
} from "@/shared/api/generated/types.gen";

interface SelectedEventCardProps {
  /** 선택된 목록 항목 — null이면 빈 상태 (AC 4) */
  selected: AdminApprovedEventItemResponseDto | null;
  /** 심사 상세 합성분 — 대표 이미지·위치·이력 (AC 4) */
  detail: AdminEventSubmissionDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onShowOnMap: () => void;
  onUnpublish: () => void;
  /** 메일 발송 실패 안내 — 없으면 미렌더 (AC 10) */
  notice: string | null;
}

/** Figma 15579:2422 문구 — 카드 하단 상시 안내 */
const STANDING_NOTICE =
  "노출을 중지하면 유저 지도와 행사방에서 즉시 사라집니다. 운영자에게 사유가 통지됩니다.";

/**
 * 선택한 행사 상세 카드 (Figma 15579:2410~2422, AC 4·6·10·11·12).
 * 목록 항목(상태·중지 정보)과 심사 상세(대표 이미지·승인일·노출 범위)를 합성한다.
 * 중지된 행사는 "노출 중지" 버튼 대신 중지 시각·사유를 보여 준다 — 재중지는 서버가
 * 409로 거절하므로 조작 자체를 없앤다(스펙 추정 4).
 */
export const SelectedEventCard = ({
  selected,
  detail,
  isPending,
  isError,
  onRetry,
  onShowOnMap,
  onUnpublish,
  notice,
}: SelectedEventCardProps) => (
  <section className="flex w-83 shrink-0 flex-col gap-md rounded-md bg-background p-lg shadow-raised">
    <h2 className="text-fm-title text-foreground">선택한 행사</h2>

    {selected === null ? (
      <p className="text-fm-body text-foreground-muted">
        행을 선택하면 상세가 표시됩니다.
      </p>
    ) : isError ? (
      <RetryNotice message="행사 상세를 불러오지 못했어요" onRetry={onRetry} />
    ) : isPending || detail === null ? (
      <div className="flex flex-col gap-md">
        <Skeleton className="h-37.5 w-full rounded-md" />
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-2/5" />
      </div>
    ) : (
      <>
        <div className="relative h-37.5 w-full overflow-hidden rounded-md bg-surface">
          <Thumbnail
            src={detail.imageUrl}
            alt={`${detail.title} 대표 이미지`}
          />
        </div>

        <div className="flex flex-col gap-xxs">
          <p className="text-fm-label text-primary">노출 상태</p>
          <h3 className="text-fm-heading font-semibold text-foreground">
            {detail.title}
          </h3>
          <p className="text-fm-caption text-foreground-muted">
            {[
              detail.organizerName,
              approvedDateLabel(detail.history) === null
                ? null
                : `승인 ${approvedDateLabel(detail.history)}`,
            ]
              .filter((part) => part !== null)
              .join(" · ")}
          </p>
          <p className="text-fm-caption text-foreground-muted">
            {formatCardPeriod(detail.startsOn, detail.endsOn)} ·{" "}
            {eventStatusBadge(selected).label}
          </p>
        </div>

        {/* 라벨→값 한 쌍이라 정의 목록이 맞다 — 스크린리더가 "노출 범위: …"로 묶어 읽는다 */}
        <dl className="flex flex-col gap-xxs">
          <dt className="text-fm-label text-foreground-muted">노출 범위</dt>
          <dd className="text-fm-label text-foreground">
            {exposureSummary(detail.locations)}
          </dd>
        </dl>

        {selected.unpublished && selected.unpublishedAt !== null && (
          <div className="flex flex-col gap-xxs rounded-sm bg-surface p-sm">
            <p className="text-fm-label text-foreground">
              {formatCardDate(selected.unpublishedAt)} 중지
            </p>
            {selected.unpublishReason !== null && (
              <p className="text-fm-caption text-foreground-body">
                {selected.unpublishReason}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-sm">
          <Button
            text="지도에서 보기"
            variant="secondary"
            className="w-full ring-1 ring-border"
            onClick={onShowOnMap}
          />
          {!selected.unpublished && (
            <Button
              text="노출 중지"
              variant="secondary"
              className="w-full text-error ring-1 ring-error"
              onClick={onUnpublish}
            />
          )}
        </div>

        {notice !== null && (
          <p role="status" className="text-fm-caption text-error">
            {notice}
          </p>
        )}
      </>
    )}

    <p className="text-fm-caption text-foreground-muted">{STANDING_NOTICE}</p>
  </section>
);
