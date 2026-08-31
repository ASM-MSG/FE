import { DotsLoader, RetryNotice } from "@fillmap/ui-web";
import { ChevronLeft } from "lucide-react";
import {
  type EventRoomSelection,
  useEventRoomStore,
} from "@/features/event/model/event-room-store";
import { useEventArchiveDetailQuery } from "@/features/event/model/use-event-archive-query";
import { EventRoomBodySwitch } from "./EventRoomBodySwitch";
import { useEscapeClose } from "./use-escape-close";
import { useEventRoomBody } from "./use-event-room-body";

interface EventRoomPanelProps {
  /** 열린 행사방 — 캡슐 세그먼트에서 받은 최소 참조 */
  room: EventRoomSelection;
  /** 뒤로가기 — 2단: 위치 선택 중이면 위치 해제, 아니면 행사방 닫기 (MSG-518 AC 12) */
  onBack: () => void;
}

/**
 * 행사방 패널 셸 (MSG-516 AC 10) — 좌측 388px 홈 패널을 교체하는 행사 화면 공용 껍데기.
 * 라우트 없이 홈 패널 상태로 렌더된다 (추정 5 — 미션/코스 상세 선례, HomePanelSwitch 분기).
 * 헤더("‹ 이벤트" / 아카이브면 "‹ 지난 행사 기록") + 본문 모드 스위치 — 헤더 우측 ↗
 * 아이콘은 용도 미확정으로 제외 (추정 7), 활성 타이틀은 "이벤트" 고정 유지 (MSG-518 확정 결정 3).
 * MSG-518: 본문 재료는 use-event-room-body가 조립하고, 위치 영상의 첫 페이지
 * 로딩(AC 9)·실패(AC 8)는 모드 밖에서 게이트한다. Escape도 뒤로가기와 같은 2단을
 * 탄다 (추정 5). overview 본문은 MSG-517이 EventRoomBodySwitch에 채운다.
 */
export const EventRoomPanel = ({ room, onBack }: EventRoomPanelProps) => {
  // 모드 입력은 상세 status 4값이 정본 (MSG-519 질문 3 승인) — 칩 status는 UPCOMING·LIVE
  // 2값뿐이라 아카이브가 이 셸에 못 들어온다. 상세 도착 전엔 칩 status 폴백(깜빡임 방지)
  const detailQuery = useEventArchiveDetailQuery(room.occurrenceId);
  const body = useEventRoomBody(room, detailQuery.data?.status ?? room.status);
  // 카드 클릭 → 행사 미니 패널 (MSG-520 AC 1·2) — 패널 렌더는 MapHomePage 몫
  const selectVideo = useEventRoomStore((s) => s.selectVideo);
  useEscapeClose(onBack);

  return (
    <section
      aria-label="행사방"
      className="flex min-h-0 flex-1 flex-col gap-md"
    >
      <header className="flex items-center gap-xs">
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로가기"
          className="shrink-0 text-foreground-muted"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-fm-title text-foreground">
          {body.mode === "archive" ? "지난 행사 기록" : "이벤트"}
        </h2>
      </header>
      {detailQuery.isError ? (
        // 상세 실패면 모드 판정 근거가 없다 — 폴백(칩 2값)으로 렌더하면 종료 행사가 활성
        // 행사로 위장되므로, 본문 대신 재시도를 준다 (MSG-519 AC 9)
        <RetryNotice
          message="행사 정보를 불러오지 못했어요"
          onRetry={() => void detailQuery.refetch()}
        />
      ) : body.isGatePending ? (
        // 부분 렌더 없이 게이트 후 한번에 표시 (AC 9 — MSG-403 좌측 패널 정책)
        <div className="flex flex-1 items-center justify-center">
          <DotsLoader label="현장 영상 불러오는 중" />
        </div>
      ) : body.isGateError ? (
        <RetryNotice
          message="현장 영상을 불러오지 못했어요"
          onRetry={body.retry}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <EventRoomBodySwitch
            mode={body.mode}
            room={room}
            location={body.location}
            videos={body.videos}
            hasNext={body.hasNext}
            loadMore={body.loadMore}
            isLoadingMore={body.isLoadingMore}
            onVideoSelect={(video) => selectVideo(video.videoId)}
          />
        </div>
      )}
    </section>
  );
};
