import { Text, View } from "react-native";
import type { HomeSheetContentContext } from "../../map-home/ui/home-sheet";
import { SheetHeader } from "../../map-home/ui/sheet-header";
import { SheetScrollView } from "../../map-home/ui/sheet-scroll-view";
import { SheetStatusView } from "../../map-home/ui/sheet-status-view";
import type { EventHome, EventOverview } from "../api/use-event-home";
import { EventLocationRow } from "./event-location-row";
import { EventStatusBadge } from "./event-status-badge";

/**
 * 행사 개요 시트 (MSG-557 D9~D11·D14 → MSG-560 D9·D10, Figma 15767:657) —
 * 헤더(‹ 행사명 [배지] ✕) · 기간 + 시청 인원 · `행사 위치 N곳` · 위치 행(탭 가능) · 안내 2줄.
 * 웹 `EventRoomOverview` 참조본. 상세·위치 실패는 본문 자리에 재시도, 헤더는 유지한다 (D11).
 *
 * 미렌더: 부제 `팝업·퍼레이드 현장을 선택해…`(사용자 결정 — 시트 문구 밀도).
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
        {/* 기간 좌 · 시청 인원 우 (D9) — 헤더 행에는 ‹·제목·배지·✕가 이미 차 있다 */}
        <View className="flex-row items-center justify-between gap-sm">
          <Text className="text-fm-caption text-foreground-muted">
            {overview.periodLabel}
          </Text>
          {overview.viewerLabel !== null && (
            <View className="flex-row items-center gap-xxs">
              <View className="size-1.5 rounded-full bg-primary" />
              <Text className="text-fm-caption text-primary">
                {overview.viewerLabel}
              </Text>
            </View>
          )}
        </View>

        <View className="gap-xs">
          <Text className="text-fm-body-strong text-foreground">
            행사 위치 {overview.cards.length}곳
          </Text>
          {overview.cards.map((card) => (
            <EventLocationRow
              key={card.locationId}
              card={card}
              onSelect={handlers.selectLocation}
            />
          ))}
        </View>

        {/* 지도 안내 — 셀 탭이 위치 상세로 이어지므로 두 문장 모두 참이다 (D2·D10) */}
        <View className="gap-xxs rounded-md bg-event-tint px-md py-sm">
          <Text className="text-fm-caption text-primary">
            지도에서도 행사 위치를 누를 수 있어요
          </Text>
          <Text className="text-fm-caption text-foreground-muted">
            파란 격자는 {overview.title} 관련 장소예요
          </Text>
        </View>
      </SheetScrollView>
    )}
  </View>
);
