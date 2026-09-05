import { Text, View } from "react-native";
import { Button, VideoCard } from "@fillmap/ui-native";
import type { HomeSheetContentContext } from "../../map-home/ui/home-sheet";
import { SheetHeader } from "../../map-home/ui/sheet-header";
import { SheetScrollView } from "../../map-home/ui/sheet-scroll-view";
import { SheetStatusView } from "../../map-home/ui/sheet-status-view";
import type { EventHome, EventLocationView } from "../api/use-event-home";
import { EventLocationEmptyState } from "./event-location-empty-state";
import { EventLocationTypeBadge } from "./event-location-type-badge";

/**
 * 행사 위치 상세 시트 (MSG-560 D4~D6·D8, Figma 15767:835) — 헤더(‹ 위치명 [유형] ✕) ·
 * 메타 `영상 N · 운영시간` · 전폭 `+ 영상 올리기` · 격자 안내 1행 ·
 * `{앞토막} 현장 영상` 섹션 + 카드 목록 + `더 보기` / 빈 위치.
 * 웹 `EventLocationHeader`·`EventLocationGridNotice`·`EventRoomBodySwitch`(videos·empty) 참조본.
 *
 * 시안과 의도적으로 다른 지점: 메타 줄에 행사명 접두가 없고(웹 `eventLocationMetaLine`),
 * 격자 안내는 1행뿐이며(서버 계약 모순 — 웹 MSG-518 확정 결정 2), 섹션 헤더에 개수·정렬
 * 칩이 없다. 카드 메타는 DTO에 닉네임·조회수가 없어 `♥ N · 댓글 M` + 상대시간이다.
 */
interface EventLocationSheetContentProps extends HomeSheetContentContext {
  location: EventLocationView;
  handlers: EventHome["handlers"];
}

export const EventLocationSheetContent = ({
  location,
  handlers,
  ...sheet
}: EventLocationSheetContentProps) => (
  <View className="flex-1 gap-sm">
    <SheetHeader
      title={location.snapshot.name}
      badge={<EventLocationTypeBadge type={location.snapshot.type} />}
      onBack={handlers.back}
      onClose={handlers.close}
    />

    <SheetStatusView
      state={location.state}
      errorText="현장 영상을 불러오지 못했어요"
      onRetry={location.retry}
    />

    {location.state === "list" && (
      <SheetScrollView {...sheet} resetKey={location.snapshot.locationId}>
        <View className="gap-sm">
          <Text className="text-fm-caption text-foreground-muted">
            {location.metaLine}
          </Text>
          {/* 종료 행사 열람에는 업로드 수단이 없다 — 그것이 읽기 전용의 표현이다 (D8) */}
          {!location.readOnly && (
            <Button
              text="+ 영상 올리기"
              variant={location.uploadVariant}
              className="w-full"
              onPress={handlers.openUpload}
            />
          )}
          <View className="rounded-sm bg-event-tint px-md py-sm">
            <Text className="text-fm-body-strong text-primary">
              {location.gridNotice}
            </Text>
          </View>
        </View>

        {location.mode === "empty" ? (
          <EventLocationEmptyState
            readOnly={location.readOnly}
            onUpload={handlers.openUpload}
          />
        ) : (
          <View className="gap-sm">
            <Text className="text-fm-title text-foreground">
              {location.sectionTitle}
            </Text>
            {location.videos.map((video) => (
              <VideoCard
                key={video.videoId}
                src={video.thumbnailUrl}
                durationLabel={video.durationLabel}
                // 카드 첫 줄이 카운트 한 줄이라 제목 스타일(body-strong) 대신 caption 노드를 넘긴다
                title={
                  <Text className="text-fm-caption text-foreground-muted">
                    {video.countsLine}
                  </Text>
                }
                meta={video.timeLabel}
                accessibilityLabel={video.accessibilityLabel}
                onPress={() => handlers.selectVideo(video.videoId)}
              />
            ))}
            {location.hasNext && (
              <Button
                text={location.isLoadingMore ? "불러오는 중" : "더 보기"}
                variant="secondary"
                size="sm"
                className="w-full border border-border"
                disabled={location.isLoadingMore}
                onPress={location.loadMore}
              />
            )}
          </View>
        )}
      </SheetScrollView>
    )}
  </View>
);
