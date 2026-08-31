import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCommentsOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import type {
  EventVideoCommentPageResponseDto,
  EventVideoCommentResponseDto,
} from "@/shared/api/generated/types.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { mergeCommentPages, nextCommentsCursor } from "./event-video-view";

export interface EventCommentsPagesResult {
  /** 첫 페이지(상세 내장) + 이어받은 페이지의 병합 목록 (오래된순, 중복 방어) */
  comments: EventVideoCommentResponseDto[];
  /** true면 "더 보기" 노출 (AC 7) */
  hasNext: boolean;
  /** 다음 페이지 이어받기 — 진행 중이거나 더 없으면 아무것도 하지 않는다 */
  loadMore: () => void;
  isLoadingMore: boolean;
}

interface ExtraPagesState {
  videoId: number;
  pages: EventVideoCommentPageResponseDto[];
}

/**
 * 댓글 페이지 로컬 축적 (MSG-520 AC 7) — 첫 페이지는 상세 응답에 내장돼 있고
 * (`getVideoDetail`), 둘째 페이지부터 `GET /api/event-videos/{videoId}/comments`
 * 커서로 잇는다. useInfiniteQuery는 첫 페이지를 자기 fetch로 가지려 해 상세 내장
 * 첫 페이지와 안 맞으므로(재조회 = 조회수 부작용) 로컬 축적으로 푼다 (스펙 재량).
 * 이어받기는 fetchQuery(use-grid-mission-routing 관례 — 클릭 응답 경로라 retry 없이
 * 즉시 판정)로 하고, 실패는 onLoadError로 알리며 받은 목록은 유지된다 (AC 9).
 * 지도 SDK·플랫폼 API를 참조하지 않는다(RN 경계).
 */
export const useEventCommentsPages = (
  videoId: number,
  firstPage: EventVideoCommentPageResponseDto | undefined,
  onLoadError?: (error: unknown) => void,
): EventCommentsPagesResult => {
  const queryClient = useQueryClient();
  const [extra, setExtra] = useState<ExtraPagesState>({ videoId, pages: [] });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 영상 교체 시 축적 리셋 — 렌더 중 상태 조정 (React 공식 "adjusting state" 패턴)
  if (extra.videoId !== videoId) {
    setExtra({ videoId, pages: [] });
  }
  const pages = extra.videoId === videoId ? extra.pages : [];

  const cursor = nextCommentsCursor(firstPage, pages);

  const loadMore = () => {
    if (cursor === null || isLoadingMore) return;
    setIsLoadingMore(true);
    void (async () => {
      try {
        const page = unwrapEnvelope(
          await queryClient.fetchQuery({
            ...getCommentsOptions({ path: { videoId }, query: { cursor } }),
            // 클릭 응답 경로 — 기본 재시도(백오프)를 기다리게 하지 않는다
            retry: false,
          }),
        );
        // 요청 중 영상이 교체됐으면 폐기 — 새 영상 목록에 이전 페이지가 섞이지 않게
        setExtra((prev) =>
          prev.videoId === videoId
            ? { videoId, pages: [...prev.pages, page] }
            : prev,
        );
      } catch (error) {
        onLoadError?.(error);
      } finally {
        setIsLoadingMore(false);
      }
    })();
  };

  return {
    comments: mergeCommentPages(firstPage, pages),
    hasNext: cursor !== null,
    loadMore,
    isLoadingMore,
  };
};
