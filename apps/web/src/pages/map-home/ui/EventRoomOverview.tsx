import { RetryNotice, Skeleton } from "@fillmap/ui-web";
import { toEventLocationSelection } from "@/features/event/model/event-location";
import {
  eventPeriodLabel,
  toLocationCardViews,
  viewerCountLabel,
} from "@/features/event/model/event-overview";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { useEventDetailQuery } from "@/features/event/model/use-event-detail-query";
import { useEventLocationsQuery } from "@/features/event/model/use-event-locations-query";
import { useViewerCountQuery } from "@/features/event/model/use-viewer-count-query";
import { EventLocationCard } from "./EventLocationCard";

/**
 * 행사 위치 개요 본문 (MSG-517 AC 1·3·4·9·10·11, Figma 15518:5919) — 행사방 셸의
 * overview 모드 본문. 행사명 + 시청 인원 + 기간 + 위치 카드 목록 + 지도 안내 배너.
 * 자급 컨테이너 (EventCapsule 선례) — 스토어·쿼리를 직접 구독해 EventRoomBodySwitch는
 * 분기 한 줄로 유지된다.
 *
 * - 시청 인원은 개요가 떠 있는 동안 30초 폴링 (AC 3) — null·실패는 표시만 생략 (AC 4)
 * - 상세·위치 조회 실패는 본문 자리에 RetryNotice (AC 10) — 재시도로 복구
 * - 배너 이미지·D-day 뱃지·"부산 전역" 요약은 의도적 미구현 — 대응 DTO 필드 없음
 *   (스펙 Figma 오탐 방지 절, 디자인 샘플)
 */
export const EventRoomOverview = () => {
  const room = useEventRoomStore((s) => s.room);
  // 카드 클릭 → 위치 상세 진입 (MSG-534) — 지도 격자 클릭의 highlightLocation(표시 전용,
  // MSG-517 AC 7)과 다른 슬롯이다. 합치면 격자 클릭이 상세로 새어 들어간다
  const selectLocation = useEventRoomStore((s) => s.selectLocation);
  const occurrenceId = room?.occurrenceId ?? null;

  const detail = useEventDetailQuery(occurrenceId);
  const locations = useEventLocationsQuery(occurrenceId);
  const { viewerCount } = useViewerCountQuery(occurrenceId);

  if (room === null) return null;

  // 실패를 로딩으로 위장하지 않는다 — 어느 조회든 실패면 재시도 행 (AC 10)
  if (detail.isError || locations.isError) {
    return (
      <RetryNotice
        message="행사 정보를 불러오지 못했어요"
        onRetry={() => {
          if (detail.isError) detail.retry();
          if (locations.isError) locations.retry();
        }}
      />
    );
  }

  // 일괄 로딩 게이트 (MSG-403 관례) — 제목·위치가 전부 준비될 때까지 자리표시만
  if (detail.isPending || locations.isPending || detail.detail === null) {
    return (
      <div
        role="status"
        aria-label="행사 정보 불러오는 중"
        className="flex flex-col gap-sm"
      >
        <Skeleton className="h-6 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
      </div>
    );
  }

  const cards = toLocationCardViews(locations.locations);
  const viewerLabel = viewerCountLabel(viewerCount);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto">
      {/* 헤더 — 행사명 + 시청 인원(블루 점 + 블루 텍스트, Figma 15518:5928) + 기간 (AC 1·3) */}
      <header className="flex flex-col gap-xxs">
        <div className="flex items-baseline justify-between gap-sm">
          <h3 className="min-w-0 truncate text-fm-title text-foreground">
            {detail.detail.title}
          </h3>
          {viewerLabel && (
            <span className="flex shrink-0 items-center gap-xxs text-fm-caption font-semibold text-primary">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              {viewerLabel}
            </span>
          )}
        </div>
        <p className="text-fm-caption text-foreground-muted">
          {eventPeriodLabel(detail.detail.startsAt, detail.detail.endsAt)}
        </p>
      </header>

      {/* 위치 목록 (AC 1·9) — 카드 클릭이 그 위치의 영상 상세로 진입한다 (MSG-534) */}
      <section aria-label="행사 위치" className="flex flex-col gap-xs">
        <h4 className="text-fm-body-strong text-foreground">
          행사 위치 {cards.length}곳
        </h4>
        <p className="text-fm-caption text-foreground-muted">
          팝업·퍼레이드 현장을 선택해 영상을 확인하세요
        </p>
        <ul className="flex flex-col gap-xs">
          {cards.map((card) => (
            <EventLocationCard
              key={card.locationId}
              card={card}
              onSelect={() =>
                selectLocation(toEventLocationSelection(card.dto))
              }
            />
          ))}
        </ul>
      </section>

      {/* 지도 안내 배너 (AC 11) — FE 고정 문구 + 행사명 보간, event-tint 배경 */}
      <aside className="flex flex-col gap-xxs rounded-md bg-event-tint px-md py-sm">
        <p className="text-fm-caption font-semibold text-primary">
          지도에서도 행사 위치를 누를 수 있어요
        </p>
        <p className="text-fm-caption text-foreground-muted">
          파란 격자는 {detail.detail.title} 관련 장소예요
        </p>
      </aside>
    </div>
  );
};
