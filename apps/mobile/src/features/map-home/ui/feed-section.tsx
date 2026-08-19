import type { GatedQueryStatus } from "../model/home-sheet-state";
import { deriveSheetState } from "../model/home-sheet-state";
import type { GridFeedItem } from "../model/grid-videos";
import { FeedVideoList } from "./feed-video-list";
import { SheetStatusView } from "./sheet-status-view";

/**
 * 영상 목록 영역의 상태 4분기 + 렌더 (MSG-427 A7·A8·C10·D11) — 미션 상세·격자 상세 공용.
 *
 * 로딩을 빈 목록으로 위장하지 않는 것이 이 조각의 존재 이유다: 도착 전에
 * "아직 영상이 없어요"를 띄우면 사용자가 없는 사실을 읽는다. 판정은 model
 * `deriveSheetState`가 하고 실패 분기에는 데이터 렌더 경로가 없다 (A8).
 */
interface FeedSectionProps {
  /** 목록 조회 상태 — 조립 훅이 내려주는 게이트 상태 그대로 */
  status: GatedQueryStatus;
  items: GridFeedItem[];
  emptyText: string;
  errorText: string;
}

export const FeedSection = ({
  status,
  items,
  emptyText,
  errorText,
}: FeedSectionProps) => {
  const state = deriveSheetState([status], items.length);

  return (
    <>
      <SheetStatusView
        state={state}
        emptyText={emptyText}
        errorText={errorText}
        onRetry={status.retry}
      />
      {state === "list" && <FeedVideoList items={items} />}
    </>
  );
};
