import { DotsLoader, RetryNotice } from "@fillmap/ui-web";
import { ChevronRight } from "lucide-react";
import { toEventLocationSelection } from "@/features/event/model/event-location";
import { formatEventPeriod } from "@/features/event/model/event-period";
import {
  useEventRoomStore,
  type EventRoomSelection,
} from "@/features/event/model/event-room-store";
import { useEventArchiveQuery } from "@/features/event/model/use-event-archive-query";

interface EventArchiveBodyProps {
  /** 열린 행사방 — 상세·위치 조회 키 */
  room: EventRoomSelection;
}

/**
 * 종료 행사 아카이브 본문 (MSG-519 AC 3·5~7·9) — Figma 15518:7350.
 * EventCapsule 선례의 자급 컨테이너 — 쿼리를 직접 구독한다(상세는 패널과 같은 키라 요청 1회).
 *
 * Figma 대비 의도적 미렌더(스펙 "Figma 오탐 방지" — 결함 아님):
 * 배너 이미지·"종료" 뱃지·지역 표기·위치 썸네일은 DTO에 필드가 없다(실측).
 * MSG-535: 위치 행을 전체 button화 + 셰브론 렌더 — 클릭이 selectLocation으로 읽기 전용
 * 위치 상세(당시 영상)를 연다 (MSG-519 "행 비활성·셰브론 미렌더" 결정을 의도적으로 뒤집음).
 * 업로드 유도 CTA는 렌더하지 않는다 (AC 7 — 조회 전용).
 */
export const EventArchiveBody = ({ room }: EventArchiveBodyProps) => {
  const { detail, locations, isPending, isError, retry } = useEventArchiveQuery(
    room.occurrenceId,
  );
  // 자급 컨테이너 패턴 유지 (MSG-517 선례) — 스토어 액션 직접 구독
  const selectLocation = useEventRoomStore((s) => s.selectLocation);

  // 실패를 로딩으로 위장하지 않는다 — 재시도 수단을 준다 (AC 9, MSG-325 선례)
  if (isError) {
    return (
      <RetryNotice
        message="지난 행사 기록을 불러오지 못했어요"
        onRetry={retry}
      />
    );
  }

  if (isPending || !detail || !locations) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <DotsLoader label="지난 행사 기록 불러오는 중" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-lg overflow-y-auto">
      {/* 행사명 + 기간 — 배너·지역 표기 없는 텍스트 헤더 (AC 3) */}
      <div className="flex flex-col gap-xxs">
        <h3 className="text-fm-heading font-semibold text-foreground">
          {detail.title}
        </h3>
        <p className="text-fm-body text-foreground-muted">
          {formatEventPeriod(detail.startsAt, detail.endsAt)}
        </p>
      </div>

      {/* 위치 목록 — 서버 정렬 유지, 행 전체 button (MSG-535 AC 3·4) */}
      <section aria-label="지난 행사 위치" className="flex flex-col gap-sm">
        <div className="flex flex-col gap-xxs">
          <h4 className="text-fm-title text-foreground">
            지난 행사 위치 {locations.length}곳
          </h4>
          <p className="text-fm-body text-foreground-muted">
            위치를 선택하면 당시 영상을 볼 수 있어요
          </p>
        </div>
        <ul className="flex flex-col gap-xs">
          {locations.map((location) => (
            <li key={location.locationId}>
              {/* aria-label이 접근명을 통째로 대체하므로 시각 노출 맥락(영상 N)까지 싣는다
                  (MSG-534 PR #114 리뷰 반영 컨벤션) */}
              <button
                type="button"
                aria-label={`${location.name} 당시 영상 보기 — 영상 ${location.videoCount}`}
                onClick={() =>
                  selectLocation(toEventLocationSelection(location))
                }
                className="flex w-full items-center gap-sm rounded-md border border-border bg-background px-md py-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-xxs">
                  <span className="truncate text-fm-base font-semibold text-foreground">
                    {location.name}
                  </span>
                  <span className="text-fm-body text-foreground-muted">
                    영상 {location.videoCount}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-foreground-muted"
                />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 보관 안내 카드 (AC 6) */}
      <div className="flex flex-col gap-xxs rounded-md border border-border bg-background px-md py-sm">
        <p className="text-fm-base font-semibold text-foreground">
          이 행사방은 기록 보관 중이에요
        </p>
        <p className="text-fm-body text-foreground-muted">
          영상과 댓글은 볼 수 있지만 새 영상은 올릴 수 없어요
        </p>
      </div>
    </div>
  );
};
