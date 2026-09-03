import type { ComponentProps } from "react";
import { HomeSheetSwitch } from "../../map-home/ui/home-sheet-switch";
import type { EventHome } from "../api/use-event-home";
import { EventListSheetContent } from "./event-list-sheet-content";
import { EventLocationSheetContent } from "./event-location-sheet-content";
import { EventOverviewSheetContent } from "./event-overview-sheet-content";

/**
 * 이벤트 시트 스위치 (MSG-557) — 이벤트 모드가 아니면 기존 `HomeSheetSwitch`로 관통하고,
 * 활성이면 위치 → 방 → 목록 순으로 시트를 가른다. 화면(`map-home-screen.tsx`)은 컴포넌트
 * 이름과 `event` prop 두 줄만 바꾼다 — `home-sheet-switch.tsx`는 병렬 티켓 소유라 손대지 않는다.
 * MSG-560: `location` case 추가 (Figma 15767:835).
 */
type EventSheetSwitchProps = ComponentProps<typeof HomeSheetSwitch> & {
  event: EventHome;
};

export const EventSheetSwitch = ({ event, ...home }: EventSheetSwitchProps) => {
  if (!event.active) return <HomeSheetSwitch {...home} />;
  if (event.location)
    return (
      <EventLocationSheetContent
        {...home.sheet}
        location={event.location}
        handlers={event.handlers}
      />
    );
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
