import type { EventLocationSelection } from "@/features/event/model/event-location";
import {
  eventRoomMode,
  isArchivedEventStatus,
  type EventRoomMode,
  type EventRoomModeInput,
} from "@/features/event/model/event-room-mode";
import {
  useEventRoomStore,
  type EventRoomSelection,
} from "@/features/event/model/event-room-store";
import {
  useLocationVideosQuery,
  type LocationVideosResult,
} from "@/features/event/model/use-location-videos-query";

export interface EventRoomBodyState {
  /** 본문 모드 — 순수 함수(event-room-mode)가 정한 값 */
  mode: EventRoomMode;
  /**
   * 종료 행사 열람 여부 (MSG-535) — 위치 상세(videos/empty)에서 업로드 CTA를 억제하고
   * 패널 헤더를 "지난 행사 기록"으로 유지하는 단일 근거 (MSG-519 AC 7 확장 적용)
   */
  readOnly: boolean;
  location: EventLocationSelection | null;
  videos: LocationVideosResult["videos"];
  hasNext: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
  /** 첫 페이지 로딩 게이트 (AC 9) — 부분 렌더 없이 DotsLoader 후 한번에 표시 */
  isGatePending: boolean;
  /** 첫 페이지 실패 게이트 (AC 8) — 본문 전체를 RetryNotice로 대체 */
  isGateError: boolean;
  retry: () => void;
}

/**
 * 뷰-레이어 훅 (MSG-518, MSG-451 선례) — 행사방 본문 재료 조립.
 * 스토어의 선택 위치 구독 + 위치 영상 쿼리 + `eventRoomMode` 입력 배선만 한다.
 * pending/error는 모드 밖에서 게이트한다 (MSG-403 좌측 패널 정책 — AC 8·9).
 * 종료 행사도 위치 선택 시 videos/empty로 열람한다(MSG-535 — readOnly가 표현을 가른다).
 * status는 상세 4값이 정본(MSG-519 — 패널이 상세 도착 전 칩 폴백을 주입), 생략 시 칩 값.
 */
export const useEventRoomBody = (
  room: EventRoomSelection,
  status: EventRoomModeInput["status"] = room.status,
): EventRoomBodyState => {
  const location = useEventRoomStore((s) => s.location);
  const query = useLocationVideosQuery(
    location === null
      ? null
      : { occurrenceId: room.occurrenceId, locationId: location.locationId },
  );

  const mode = eventRoomMode({
    status,
    selectedLocationId: location?.locationId ?? null,
    hasLocationVideos: query.hasLocationVideos,
  });
  // 게이트는 위치 본문(videos/empty)이 뜰 자리에만 — archive/overview는 쿼리와 무관
  const gated = location !== null && mode !== "archive";

  return {
    mode,
    readOnly: isArchivedEventStatus(status),
    location,
    videos: query.videos,
    hasNext: query.hasNext,
    loadMore: query.loadMore,
    isLoadingMore: query.isLoadingMore,
    isGatePending: gated && query.isPending,
    isGateError: gated && query.isError,
    retry: query.retry,
  };
};
