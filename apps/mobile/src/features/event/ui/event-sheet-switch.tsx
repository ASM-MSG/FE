import type { ComponentProps } from "react";
import { HomeSheetSwitch } from "../../map-home/ui/home-sheet-switch";
import type { EventHome } from "../api/use-event-home";
import { EventListSheetContent } from "./event-list-sheet-content";
import { EventOverviewSheetContent } from "./event-overview-sheet-content";

/**
 * 이벤트 시트 스위치 (MSG-557) — 이벤트 모드가 아니면 기존 `HomeSheetSwitch`로 관통하고,
 * 활성이면 방 유무로 목록/개요를 가른다. 화면(`map-home-screen.tsx`)은 컴포넌트 이름과
 * `event` prop 두 줄만 바꾼다 — `home-sheet-switch.tsx`는 병렬 티켓 소유라 손대지 않는다.
 * 2단계 확장점: `location` case (Figma 15767:835).
 */
type EventSheetSwitchProps = ComponentProps<typeof HomeSheetSwitch> & {
  event: EventHome;
};

export const EventSheetSwitch = ({ event, ...home }: EventSheetSwitchProps) => {
  if (!event.active) return <HomeSheetSwitch {...home} />;
  return event.overview ? (
    <EventOverviewSheetContent
      {...home.sheet}
      overview={event.overview}
      handlers={event.handlers}
    />
  ) : (
    <EventListSheetContent {...home.sheet} event={event} />
  );
};
