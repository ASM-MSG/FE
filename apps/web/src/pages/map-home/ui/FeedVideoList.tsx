import type {
  FeedVideo,
  GridFeedItem,
} from "@/features/map-home/model/grid-videos";
import { FeedVideoCard } from "./FeedVideoCard";

interface FeedVideoListProps {
  /** 나열 항목 — 격자 상세(GridFeedItem)·테마 피드(ThemeFeedVideo) 둘 다 구조적으로 할당 가능 */
  items: GridFeedItem[];
  /** 카드 클릭 — 미니 디테일 패널 열기/교체 (셀 상세·테마 피드 공통 배선) */
  onVideoSelect: (video: FeedVideo, mine: boolean) => void;
}

/**
 * 세로 1열 피드 카드 나열 (MSG-326) — 격자 상세·테마 피드 공용.
 * 두 패널이 같은 카드 나열 마크업을 각자 들고 있으면 디자인 변경 시 한쪽만 고쳐진다 —
 * 두 번째 사용처가 생긴 시점의 추출(Simplicity First의 추출 경로).
 */
export const FeedVideoList = ({ items, onVideoSelect }: FeedVideoListProps) => (
  <div className="flex flex-col gap-sm">
    {items.map((item, index) => (
      <FeedVideoCard
        key={item.videoId}
        video={item}
        mine={item.mine}
        position={index + 1}
        onSelect={() => onVideoSelect(item, item.mine)}
      />
    ))}
  </div>
);
