import { Text, View } from "react-native";
import { VideoCard } from "@fillmap/ui-native";
import { formatDuration, formatViewCount } from "../../../shared/format";
import { goToVideoPlayback } from "../../../shared/navigation";
import { videoOwnerLabel, type GridFeedItem } from "../model/grid-videos";

/**
 * 1열 영상 목록 (MSG-427 B7·C10·D11) — 핫구역 요약·격자 상세·미션 상세 공용.
 *
 * **[MSG-446 이행 완료] 카드 탭 → 재생 화면.** MSG-427 B10이 `onPress`를 보류한 이유는
 * "모바일에 재생 화면도 라우트도 없다"였고(목적지 없는 `onPress`는 `VideoCard`가
 * `accessibilityRole="button"`을 켜 스크린리더에 가짜 버튼을 노출시킨다 — MSG-421 실기
 * 검증이 잡은 지점), MSG-446이 `/video/[videoId]`를 만들어 그 전제를 없앴다.
 * 이 파일 하나가 **진입점 3곳**(핫구역 요약 시트·격자 상세 시트·미션 상세 시트)을 덮고,
 * 코스 스팟은 격자 상세 시트를 경유하므로 함께 해소된다.
 *
 * 라우트 리터럴은 `shared/navigation`의 어댑터에 가둔다 — 진입점 4곳이 같은 목적지로
 * 들어가는 것을 한 곳에서 보장하기 위함이다.
 * `accessibilityLabel`을 함께 주는 이유: 카드 자식은 소유 문구·조회수라 낭독은 되지만
 * **버튼 이름으로 읽히기엔 어떤 영상인지가 모호하다**(같은 격자의 카드가 여럿이다).
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
          accessibilityLabel={`${videoOwnerLabel(item, item.mine)} 영상, ${formatDuration(item.durationSec)}`}
          onPress={() => goToVideoPlayback(item.videoId, item.mine)}
        />
      ))}
    </View>
  );
};
