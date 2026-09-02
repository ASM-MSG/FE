import { View } from "react-native";
import type { HomeSheetContentContext } from "../../map-home/ui/home-sheet";
import { SheetScrollView } from "../../map-home/ui/sheet-scroll-view";
import { SheetStatusView } from "../../map-home/ui/sheet-status-view";
import type { EventHome } from "../api/use-event-home";
import { EventBadgeHeader } from "./event-badge-header";
import { EventCard } from "./event-card";

/**
 * 행사 목록 시트 (MSG-557 D1·D6·D18, Figma 15767:463) — `이벤트 · N개` + 카드 목록.
 * 빈 상태 문구는 `mission-list-sheet-content` 형식 미러. 이벤트 모드 중 행사 0건 지역으로
 * 이동해도 칩은 남고 여기가 빈 문구를 보인다 (D18).
 */
interface EventListSheetContentProps extends HomeSheetContentContext {
  event: EventHome;
}

export const EventListSheetContent = ({
  event,
  ...sheet
}: EventListSheetContentProps) => (
  <View className="flex-1 gap-sm">
    <EventBadgeHeader count={event.cards.length} />

    <SheetStatusView
      state={event.listState}
      emptyText="지금 진행 중인 행사가 없어요"
      errorText="행사 목록을 불러오지 못했어요"
      onRetry={event.retryList}
    />

    {event.listState === "list" && (
      <SheetScrollView {...sheet}>
        {event.cards.map((view) => (
          <EventCard
            key={view.occurrenceId}
            view={view}
            onSelect={event.handlers.selectEvent}
          />
        ))}
      </SheetScrollView>
    )}
  </View>
);
