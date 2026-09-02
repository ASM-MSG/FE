import { useState } from "react";
import { Button, RetryNotice, Skeleton } from "@fillmap/ui-web";
import {
  formatPreviewAreaSummary,
  formatPreviewPeriod,
  submissionTypeLabel,
} from "@/features/admin-review/model/submission-view";
import type { AdminEventSubmissionDetailResponseDto } from "@/shared/api/generated/types.gen";

interface ReviewPreviewCardProps {
  /** 선택된 행이 있는지 — 미선택이면 상세 쿼리가 발사되지 않아 pending과 구별해야 한다 */
  selected: boolean;
  detail: AdminEventSubmissionDetailResponseDto | null;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onOpenDetail: () => void;
}

/**
 * 대표 이미지 — presigned GET URL이 만료되면(TTL 미상) 자리표시로 대체한다.
 * ui-web `Thumbnail`은 폴백이 격자 로고라 관리자 심사 카드에 어색해 로컬 `<img>`를 쓴다
 * (스펙 코드베이스 대조 결과). 실패 상태는 src가 바뀌면 리셋돼야 하므로 호출부가 `key`로
 * 리마운트한다 — 상태 초기화 effect를 두지 않는다.
 */
const PreviewImage = ({ src, alt }: { src: string; alt: string }) => {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-sm bg-surface text-fm-caption text-foreground-muted">
        이미지를 불러올 수 없어요
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="aspect-video w-full rounded-sm bg-surface object-cover"
    />
  );
};

const PreviewSkeleton = () => (
  <div className="flex flex-col gap-md">
    <p role="status" className="sr-only">
      선택한 신청을 불러오는 중
    </p>
    <Skeleton className="aspect-video w-full rounded-sm" />
    <Skeleton className="h-4 w-3/5" />
    <Skeleton className="h-3.5 w-2/5" />
    <Skeleton className="h-3.5 w-4/5" />
  </div>
);

/**
 * 선택한 신청 미리보기 카드 (MSG-552 AC 7·9) — SOURCE: Figma "[v2] [관리자 2]
 * 행사 심사 큐" (node 15525:9124). 목록 응답에 없는 대표 이미지·사각형 수·칸 수를
 * 상세 응답으로 채운다(추정 1). 미선택·로딩·실패 분기를 카드가 소유하고,
 * "반려 시 사유 입력 필수" 각주는 상태와 무관하게 상시 보인다.
 */
export const ReviewPreviewCard = ({
  selected,
  detail,
  isPending,
  isError,
  onRetry,
  onOpenDetail,
}: ReviewPreviewCardProps) => {
  const typeLabel = detail === null ? null : submissionTypeLabel(detail.type);

  return (
    <section
      aria-labelledby="review-preview-heading"
      className="flex w-82.5 shrink-0 flex-col gap-md self-stretch rounded-md border border-border bg-background p-lg"
    >
      <h2 id="review-preview-heading" className="text-fm-title text-foreground">
        선택한 신청
      </h2>

      {!selected ? (
        <p className="text-fm-body text-foreground-muted">
          신청을 선택하면 미리보기가 보여요
        </p>
      ) : isError ? (
        <RetryNotice
          message="신청 상세를 불러오지 못했어요"
          onRetry={onRetry}
        />
      ) : isPending || detail === null ? (
        <PreviewSkeleton />
      ) : (
        <div className="flex flex-col gap-md">
          <PreviewImage
            key={detail.imageUrl}
            src={detail.imageUrl}
            alt={`${detail.title} 대표 이미지`}
          />
          <div className="flex flex-col gap-xxs">
            {typeLabel !== null && (
              <p className="text-fm-label text-primary">{typeLabel}</p>
            )}
            <h3 className="text-fm-heading font-semibold text-foreground">
              {detail.title}
            </h3>
            <p className="text-fm-body text-foreground-body">
              {detail.organizerName}
            </p>
            <p className="text-fm-body text-foreground-muted">
              {formatPreviewPeriod(detail.startsOn, detail.endsOn)}
            </p>
          </div>
          <div className="flex flex-col gap-xxs">
            <p className="text-fm-caption text-foreground-muted">등록 위치</p>
            <p className="text-fm-body-strong text-foreground">
              {formatPreviewAreaSummary(detail.locations)}
            </p>
          </div>
          <Button
            text="상세에서 영역 검토"
            variant="secondary"
            onClick={onOpenDetail}
            className="w-full border border-border"
          />
        </div>
      )}

      <p className="mt-auto text-fm-caption text-foreground-muted">
        반려 시 사유 입력 필수
      </p>
    </section>
  );
};
