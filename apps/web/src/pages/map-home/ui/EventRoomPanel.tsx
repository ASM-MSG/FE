import { ChevronLeft } from "lucide-react";
import { eventRoomMode } from "@/features/event/model/event-room-mode";
import type { EventRoomSelection } from "@/features/event/model/event-room-store";
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
 * 헤더("‹ 이벤트") + 본문 모드 스위치 — 헤더 우측 ↗ 아이콘은 용도 미확정으로 제외 (추정 7).
 * 본문(개요/영상/빈/아카이브)은 MSG-517~519가 EventRoomBodySwitch에 채운다.
 */
export const EventRoomPanel = ({ room, onBack }: EventRoomPanelProps) => (
  <section aria-label="행사방" className="flex min-h-0 flex-1 flex-col gap-md">
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
        이벤트
      </h2>
    </header>
    <EventRoomBodySwitch mode={eventRoomMode({ status: room.status })} />
  </section>
);
