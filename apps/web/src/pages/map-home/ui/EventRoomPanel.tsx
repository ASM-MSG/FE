import { RetryNotice } from "@fillmap/ui-web";
import { ChevronLeft } from "lucide-react";
import { eventRoomMode } from "@/features/event/model/event-room-mode";
import type { EventRoomSelection } from "@/features/event/model/event-room-store";
import { useEventArchiveDetailQuery } from "@/features/event/model/use-event-archive-query";
import { EventRoomBodySwitch } from "./EventRoomBodySwitch";

interface EventRoomPanelProps {
  /** 열린 행사방 — 캡슐 세그먼트에서 받은 최소 참조 */
  room: EventRoomSelection;
  /** 뒤로가기 — 홈 패널 복귀 + 세그먼트 활성 해제 (AC 10) */
  onBack: () => void;
}

/**
 * 행사방 패널 셸 (MSG-516 AC 10) — 좌측 388px 홈 패널을 교체하는 행사 화면 공용 껍데기.
 * 라우트 없이 홈 패널 상태로 렌더된다 (추정 5 — 미션/코스 상세 선례, HomePanelSwitch 분기).
 * 헤더("‹ 이벤트" / 아카이브면 "‹ 지난 행사 기록") + 본문 모드 스위치 — 헤더 우측 ↗
 * 아이콘은 용도 미확정으로 제외 (추정 7).
 * 본문(개요/영상/빈/아카이브)은 MSG-517~519가 EventRoomBodySwitch에 채운다.
 */
export const EventRoomPanel = ({ room, onBack }: EventRoomPanelProps) => {
  // 모드 입력은 상세 status 4값이 정본 (MSG-519 질문 3 승인) — 칩 status는 UPCOMING·LIVE
  // 2값뿐이라 아카이브가 이 셸에 못 들어온다. 상세 도착 전엔 칩 status 폴백(깜빡임 방지)
  const detailQuery = useEventArchiveDetailQuery(room.occurrenceId);
  const mode = eventRoomMode({
    status: detailQuery.data?.status ?? room.status,
  });

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
          {mode === "archive" ? "지난 행사 기록" : "이벤트"}
        </h2>
      </header>
      {detailQuery.isError ? (
        // 상세 실패면 모드 판정 근거가 없다 — 폴백(칩 2값)으로 렌더하면 종료 행사가 활성
        // 행사로 위장되므로, 본문 대신 재시도를 준다 (MSG-519 AC 9)
        <RetryNotice
          message="행사 정보를 불러오지 못했어요"
          onRetry={() => void detailQuery.refetch()}
        />
      ) : (
        <EventRoomBodySwitch mode={mode} room={room} />
      )}
    </section>
  );
};
