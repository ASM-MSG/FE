import { Text, View } from "react-native";
import type { HomeSheetContentContext } from "../../map-home/ui/home-sheet";
import { SheetHeader } from "../../map-home/ui/sheet-header";
import { SheetScrollView } from "../../map-home/ui/sheet-scroll-view";
import { SheetStatusView } from "../../map-home/ui/sheet-status-view";
import type { EventHome, EventOverview } from "../api/use-event-home";
import { EventLocationRow } from "./event-location-row";
import { EventStatusBadge } from "./event-status-badge";

/**
 * 행사 개요 시트 (MSG-557 D9·D10·D11·D14, Figma 15767:657) — 헤더(‹ 행사명 [배지] ✕) ·
 * 기간 · `행사 위치 N곳` · 위치 행 · 안내 1줄. 웹 `EventRoomOverview` 참조본.
 * 미렌더(D10): 시청 인원·부제·안내 1행(`지도에서도 …`)·행 탭 — 1단계에 그 동작이 없어
 * 문구가 거짓이 된다. 상세·위치 실패는 본문 자리에 재시도, 헤더는 유지한다 (D11).
 */
interface EventOverviewSheetContentProps extends HomeSheetContentContext {
  overview: EventOverview;
  handlers: EventHome["handlers"];
}

export const EventOverviewSheetContent = ({
  overview,
  handlers,
  ...sheet
}: EventOverviewSheetContentProps) => (
  <View className="flex-1 gap-sm">
    <SheetHeader
      title={overview.title}
      badge={overview.badge && <EventStatusBadge badge={overview.badge} />}
      onBack={handlers.back}
      onClose={handlers.close}
    />

    <SheetStatusView
      state={overview.state}
      errorText="행사 정보를 불러오지 못했어요"
      onRetry={overview.retry}
    />

    {overview.state === "list" && (
      <SheetScrollView {...sheet} resetKey={overview.occurrenceId}>
        <Text className="text-fm-caption text-foreground-muted">
          {overview.periodLabel}
        </Text>

        <View className="gap-xs">
          <Text className="text-fm-body-strong text-foreground">
            행사 위치 {overview.cards.length}곳
          </Text>
          {overview.cards.map((card) => (
            <EventLocationRow key={card.locationId} card={card} />
          ))}
        </View>

        {/* 지도 안내 — 웹 배너 2행 중 1단계에 참인 문장만 (D10) */}
        <View className="rounded-md bg-event-tint px-md py-sm">
          <Text className="text-fm-caption text-foreground-muted">
            파란 격자는 {overview.title} 관련 장소예요
          </Text>
        </View>
      </SheetScrollView>
    )}
  </View>
);
