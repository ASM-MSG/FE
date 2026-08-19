import { Text, View } from "react-native";
import { VideoCard } from "@fillmap/ui-native";
import { formatDuration, formatViewCount } from "../../../shared/format";
import { videoOwnerLabel, type GridFeedItem } from "../model/grid-videos";

/**
 * 1열 영상 목록 (MSG-427 B7·C10·D11) — 핫구역 요약·격자 상세·미션 상세 공용.
 *
 * **카드에 `onPress`를 배선하지 않는다** (B10, 티켓 제외 범위): 모바일에는 재생 화면도
 * 라우트도 없다. 목적지 없이 onPress를 붙이면 `VideoCard`가 `accessibilityRole="button"`을
 * 켜 스크린리더에 "가짜 버튼"이 노출된다 — MSG-421 실기 검증이 잡았고 MSG-423·425가
 * 같은 이유로 기각한 지점이다. 재생 화면 티켓이 생기면 그때 배선한다.
 */
interface FeedVideoListProps {
  items: GridFeedItem[];
  /** 0건 문구 — 생략하면 빈 목록에서 아무것도 그리지 않는다(호출부가 상태 뷰로 대신한다) */
  emptyText?: string;
}

export const FeedVideoList = ({ items, emptyText }: FeedVideoListProps) => {
  if (items.length === 0)
    return emptyText === undefined ? null : (
      <Text className="text-fm-body text-foreground-muted">{emptyText}</Text>
    );

  return (
    <View className="gap-md">
      {items.map((item) => (
        <VideoCard
          key={item.videoId}
          src={item.thumbnailUrl ?? undefined}
          durationLabel={formatDuration(item.durationSec)}
          title={videoOwnerLabel(item, item.mine)}
          meta={
            item.viewCount === null
              ? undefined
              : `조회 ${formatViewCount(item.viewCount)}`
          }
        />
      ))}
    </View>
  );
};
