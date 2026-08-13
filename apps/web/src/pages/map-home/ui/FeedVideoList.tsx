import type {
  FeedVideo,
  GridFeedItem,
} from "@/features/map-home/model/grid-videos";
import { FeedVideoCard } from "./FeedVideoCard";

interface FeedVideoListProps {
  /** 나열 항목 — 격자 상세(GridFeedItem)·테마 피드(ThemeFeedVideo) 둘 다 구조적으로 할당 가능 */
  items: GridFeedItem[];
  /**
   * 순번 시작 오프셋 — 한 화면이 리스트를 여러 인스턴스로 쪼개 렌더하면(테마 피드 섹션)
   * 인스턴스 내부 순번이 1부터 재시작해 화면 전체 이름 유일성이 깨진다. 호출부가 누적
   * 오프셋을 넘겨 순번을 경계 너머로 잇는다 (PR #51 리뷰 반영 3차). 단일 리스트는 생략(0)
   */
  startIndex?: number;
  /** 카드 클릭 — 미니 디테일 패널 열기/교체 (셀 상세·테마 피드 공통 배선) */
  onVideoSelect: (video: FeedVideo, mine: boolean) => void;
}

/**
 * 세로 1열 피드 카드 나열 (MSG-326) — 격자 상세·테마 피드 공용.
 * 두 패널이 같은 카드 나열 마크업을 각자 들고 있으면 디자인 변경 시 한쪽만 고쳐진다 —
 * 두 번째 사용처가 생긴 시점의 추출(Simplicity First의 추출 경로).
 */
export const FeedVideoList = ({
  items,
  startIndex = 0,
  onVideoSelect,
}: FeedVideoListProps) => (
  <div className="flex flex-col gap-sm">
    {items.map((item, index) => (
      <FeedVideoCard
        key={item.videoId}
        video={item}
        mine={item.mine}
        position={startIndex + index + 1}
        onSelect={() => onVideoSelect(item, item.mine)}
      />
    ))}
  </div>
);
