import { Fragment, useMemo } from "react";
import { cn } from "@fillmap/ui-web";
import {
  cityLabel,
  toEventSegments,
  type EventSegmentView,
} from "@/features/event/model/event-chip";
import { useKstToday } from "@/features/event/model/use-kst-today";
import { useEventCapsuleStore } from "@/features/event/model/event-capsule-store";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { useEventOccurrencesQuery } from "@/features/event/model/use-event-occurrences-query";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useReverseGeocodeQuery } from "@/features/region/model/use-reverse-geocode-query";

/**
 * 위치 기반 행사 캡슐 (MSG-516 AC 3~5·8·9) — 상단 칩 바(테마 칩 4종 오른쪽)의 연결 캡슐.
 * Figma 정본: 연결 캡슐 15806:3654 · 접힘 15518:8352 · 배치 15518:5468.
 *
 * - 지역명은 **라이브 역지오코딩**(500ms 디바운스)의 시 축약 (추정 1) — 확정 지역과 달리
 *   지도를 다른 시로 옮기면 따라 바뀐다
 * - 행사 목록은 뷰포트 bbox 조회 (추정 2) — 빈 배열·실패·저줌 미발사면 캡슐 미렌더 (AC 8)
 * - 펼침 모션: 캡슐 확장 240ms ease-out + 세그먼트 stagger 70ms(opacity·translateX),
 *   접힘은 역순 없이 140ms 일괄 (AC 5, 시안 모션 명세)
 * - 세그먼트 클릭 → 행사방 열림 + 활성 표시(흰 배경 + 블루 텍스트 — AC 9). 테마 칩·열린
 *   격자 상세와는 상호 배타 (추정 6)
 */
export const EventCapsule = () => {
  const center = useViewportStore((s) => s.center);
  const bounds = useViewportStore((s) => s.bounds);
  const expanded = useEventCapsuleStore((s) => s.expanded);
  const expand = useEventCapsuleStore((s) => s.expand);
  const collapse = useEventCapsuleStore((s) => s.collapse);
  const room = useEventRoomStore((s) => s.room);
  const openRoom = useEventRoomStore((s) => s.open);

  const reverse = useReverseGeocodeQuery(center);
  const { chips } = useEventOccurrencesQuery(bounds);

  const city = cityLabel(reverse.region?.regionName ?? null);
  // "오늘"은 자정 전환을 추종하는 훅으로 — 고정값이면 자정 넘김 시 D-day 스테일 (codex P2)
  const today = useKstToday();
  const segments = useMemo(() => toEventSegments(chips, today), [chips, today]);

  // 행사 없음(빈 배열·실패·저줌)·지역명 미확정이면 캡슐 자체를 걷는다 (AC 8, 추정 3)
  if (segments.length === 0 || city === null) return null;

  const handleSegmentSelect = (segment: EventSegmentView) => {
    // 테마 칩 화면·열린 격자 상세와 상호 배타 (추정 6) — 테마 해제(toggle)가 셀 상세·미션
    // 선택까지 체인으로 정리한다(theme-filter-store 관례). 테마가 없으면 셀 상세만 걷는다
    const themeFilter = useThemeFilterStore.getState();
    if (themeFilter.activeTheme !== null) {
      themeFilter.toggle(themeFilter.activeTheme);
    } else {
      useHomeCellDetailStore.getState().close();
    }
    openRoom({
      occurrenceId: segment.occurrenceId,
      title: segment.title,
      status: segment.status,
    });
  };

  return (
    <div className="flex items-stretch overflow-hidden rounded-full bg-event-tint shadow-raised">
      {/* 머리 — 접힘: 연블루 + 카운트 배지 + ▾ / 열림: 브랜드 블루 반전 + ✕ (AC 3·5) */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={
          expanded
            ? `${city} 행사 목록 닫기`
            : `${city} 행사 ${segments.length}건 펼치기`
        }
        onClick={expanded ? collapse : expand}
        className={cn(
          "flex shrink-0 items-center gap-1.5 whitespace-nowrap py-2.5 text-fm-base font-semibold transition-colors",
          expanded
            ? "bg-primary pl-3.5 pr-3 text-primary-foreground"
            : "bg-event-tint pl-3 pr-3.5 text-primary",
        )}
      >
        <span>
          <span aria-hidden="true">📍 </span>
          {city}
        </span>
        {expanded ? (
          <span aria-hidden="true" className="text-fm-label">
            ✕
          </span>
        ) : (
          <>
            <span
              aria-hidden="true"
              className="rounded-full bg-primary px-1.5 py-0.5 text-fm-caption font-semibold text-primary-foreground"
            >
              {segments.length}
            </span>
            <span aria-hidden="true" className="text-fm-label">
              ▾
            </span>
          </>
        )}
      </button>

      {/* 세그먼트 레일 — grid 0fr↔1fr 폭 트랜지션 (확장 240ms ease-out / 접힘 140ms 일괄) */}
      <div
        inert={!expanded}
        className={cn(
          "grid transition-[grid-template-columns] ease-out",
          expanded
            ? "grid-cols-[1fr] duration-[240ms]"
            : "grid-cols-[0fr] duration-[140ms]",
        )}
      >
        <div className="flex items-stretch overflow-hidden">
          {segments.map((segment, index) => {
            const active = room?.occurrenceId === segment.occurrenceId;
            return (
              <Fragment key={segment.occurrenceId}>
                {/* 인접 세그먼트 사이 1px 블루 20% 구분선 (AC 5) */}
                {index > 0 && (
                  <div
                    aria-hidden="true"
                    className="w-px shrink-0 self-stretch bg-primary/20"
                  />
                )}
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleSegmentSelect(segment)}
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-fm-base font-semibold transition-[opacity,translate]",
                    // 활성 = 흰 배경 + 블루 텍스트 (AC 9 — 블루 채움 아님, 정본 2026-08-31)
                    active
                      ? "bg-background text-primary"
                      : "bg-event-tint text-foreground",
                    expanded
                      ? "translate-x-0 opacity-100 duration-[240ms]"
                      : "-translate-x-2 opacity-0 duration-[140ms]",
                  )}
                  // stagger 70ms — 왼쪽→오른쪽 순차 등장, 접힘은 지연 없이 일괄 (AC 5)
                  style={
                    expanded
                      ? { transitionDelay: `${index * 70}ms` }
                      : undefined
                  }
                >
                  {segment.dDay
                    ? `${segment.title} ${segment.dDay}`
                    : segment.title}
                </button>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
