import { useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import { getCommentsOptions } from "../../../shared/api/query-options";
import type {
  EventVideoCommentPageResponseDto,
  EventVideoCommentResponseDto,
} from "../../../shared/api/sdk";
import {
  mergeCommentPages,
  nextCommentsCursor,
} from "../model/event-video-view";

/**
 * 댓글 페이지 이어받기 (MSG-562 D5) — `GET /api/event-videos/{videoId}/comments?cursor=`.
 * fetchQuery + retry:false — 탭 응답 경로라 기본 재시도(백오프)를 기다리게 하지 않는다.
 * 훅 밖으로 뺀 이유는 이 요청 경로를 테스트가 직접 구동하기 위함(모바일은 훅 렌더 테스트 없음).
 */
export const fetchCommentsPage = async (
  queryClient: QueryClient,
  videoId: number,
  cursor: string,
): Promise<EventVideoCommentPageResponseDto> =>
  unwrapEnvelope(
    await queryClient.fetchQuery({
      ...getCommentsOptions({ path: { videoId }, query: { cursor } }),
      retry: false,
    }),
  );

export interface EventCommentsPagesResult {
  /** 첫 페이지(상세 내장) + 이어받은 페이지의 병합 목록 (오래된순, 중복 방어) */
  comments: EventVideoCommentResponseDto[];
  /** true면 "더 보기" 노출 (AC 5) */
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
 * 댓글 페이지 로컬 축적 (MSG-562 D5) — 웹 `use-event-comments-pages.ts` 이식. 첫 페이지는
 * 상세 응답에 내장돼 있고, 둘째 페이지부터 커서로 잇는다. useInfiniteQuery는 첫 페이지를
 * 자기 fetch로 가지려 해 상세 내장 첫 페이지와 안 맞으므로(재조회 = 조회수 부작용) 로컬 축적.
 * 실패는 onLoadError로 알리며 받은 목록은 유지된다 (AC 5).
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
        const page = await fetchCommentsPage(queryClient, videoId, cursor);
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
