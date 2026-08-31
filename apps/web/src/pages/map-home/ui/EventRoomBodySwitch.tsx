import { Button } from "@fillmap/ui-web";
import type { EventLocationSelection } from "@/features/event/model/event-location";
import { eventLocationSectionTitle } from "@/features/event/model/event-location";
import type { EventRoomMode } from "@/features/event/model/event-room-mode";
import type { EventRoomSelection } from "@/features/event/model/event-room-store";
import type { EventLocationVideoResponseDto } from "@/shared/api/generated/types.gen";
import { EventArchiveBody } from "./EventArchiveBody";
import { EventLocationEmptyState } from "./EventLocationEmptyState";
import { EventLocationGridNotice } from "./EventLocationGridNotice";
import { EventLocationHeader } from "./EventLocationHeader";
import { EventRoomOverview } from "./EventRoomOverview";
import { EventVideoCard } from "./EventVideoCard";

interface EventRoomBodySwitchProps {
  /** 표시할 본문 모드 — 순수 함수(event-room-mode)가 정한 값 */
  mode: EventRoomMode;
  /** 열린 행사방 — 자급 본문(archive)의 조회 키 (MSG-519) */
  room: EventRoomSelection;
  /** 선택된 행사 위치 — videos/empty 모드의 헤더·배너 재료 (MSG-518) */
  location: EventLocationSelection | null;
  /** 위치 영상 목록(최신순 평탄화) — videos 모드 재료 (MSG-518 AC 5) */
  videos: EventLocationVideoResponseDto[] | undefined;
  hasNext: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}

/** 위치 선택 공통 상단 — 헤더 + 격자 안내 (AC 3·4) */
const LocationTop = ({
  location,
  uploadVariant,
}: {
  location: EventLocationSelection;
  uploadVariant: "primary" | "secondary";
}) => (
  <>
    <EventLocationHeader location={location} uploadVariant={uploadVariant} />
    <EventLocationGridNotice gridCount={location.gridCount} />
  </>
);

/**
 * 행사방 본문 모드 스위치 (MSG-516 AC 11) — 본문 분기 렌더는 이 한 파일에 모인다
 * (MSG-427 home-sheet-switch 확장점 패턴). 후속 티켓은 자기 case만 실 본문으로 교체한다:
 * - MSG-517: overview → 행사 위치 개요 (배너·시청 인원·위치 목록) ✅
 * - MSG-518: videos → 위치별 영상 목록 · empty → 빈 상태 ✅
 * - MSG-519: archive → 종료 행사 아카이브 ✅
 */
export const EventRoomBodySwitch = ({
  mode,
  room,
  location,
  videos,
  hasNext,
  loadMore,
  isLoadingMore,
}: EventRoomBodySwitchProps) => {
  switch (mode) {
    case "archive":
      return <EventArchiveBody room={room} />;
    case "videos":
      // mode가 videos면 location은 항상 있다(판정 입력) — 타입 좁히기용 가드
      if (location === null) return null;
      return (
        <div className="flex flex-col gap-md">
          <LocationTop location={location} uploadVariant="primary" />
          <section
            aria-label={eventLocationSectionTitle(location.name)}
            className="flex flex-col gap-sm"
          >
            <h4 className="text-fm-title text-foreground">
              {eventLocationSectionTitle(location.name)}
            </h4>
            <ul className="flex flex-col gap-md">
              {(videos ?? []).map((video) => (
                <EventVideoCard key={video.videoId} video={video} />
              ))}
            </ul>
            {hasNext && (
              <Button
                text={isLoadingMore ? "불러오는 중" : "더 보기"}
                variant="secondary"
                size="sm"
                disabled={isLoadingMore}
                onClick={loadMore}
                className="w-full"
              />
            )}
          </section>
        </div>
      );
    case "empty":
      if (location === null) return null;
      return (
        <div className="flex flex-col gap-md">
          {/* 빈 상태(6612)의 헤더 버튼은 흰 배경 — 전폭 CTA가 유일한 primary */}
          <LocationTop location={location} uploadVariant="secondary" />
          <EventLocationEmptyState />
        </div>
      );
    case "overview":
      // MSG-517 — 위치 개요 (자급 컨테이너, 스토어·쿼리 직접 구독)
      return <EventRoomOverview />;
  }
};
