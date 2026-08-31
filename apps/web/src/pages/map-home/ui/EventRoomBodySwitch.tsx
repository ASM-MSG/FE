import type { EventRoomMode } from "@/features/event/model/event-room-mode";
import type { EventRoomSelection } from "@/features/event/model/event-room-store";
import { EventArchiveBody } from "./EventArchiveBody";

interface EventRoomBodySwitchProps {
  /** 표시할 본문 모드 — 순수 함수(event-room-mode)가 정한 값 */
  mode: EventRoomMode;
  /** 열린 행사방 — 자급 본문(archive)의 조회 키 (MSG-519) */
  room: EventRoomSelection;
}

/**
 * 행사방 본문 모드 스위치 (MSG-516 AC 11) — 본문 분기 렌더는 이 한 파일에 모인다
 * (MSG-427 home-sheet-switch 확장점 패턴). 후속 티켓은 자기 case만 실 본문으로 교체한다:
 * - MSG-517: overview → 행사 위치 개요 (배너·시청 인원·위치 목록)
 * - MSG-518: videos → 위치별 영상 목록 · empty → 빈 상태
 * - MSG-519: archive → 종료 행사 아카이브 ✅
 */
export const EventRoomBodySwitch = ({
  mode,
  room,
}: EventRoomBodySwitchProps) => {
  switch (mode) {
    case "archive":
      return <EventArchiveBody room={room} />;
    case "overview":
    case "videos":
    case "empty":
      // 잔여 모드 자리표시 (MSG-516 추정 7) — 본문 부재는 결함이 아니라 병렬 티켓 몫이다
      return (
        <p className="text-fm-body text-foreground-muted">
          행사 정보를 준비 중이에요
        </p>
      );
  }
};
