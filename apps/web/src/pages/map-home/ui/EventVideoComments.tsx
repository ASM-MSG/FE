import { Avatar, Button } from "@fillmap/ui-web";
import type { EventVideoCommentResponseDto } from "@/shared/api/generated/types.gen";
import { formatRelativeTime } from "@/shared/format";

interface EventVideoCommentsProps {
  /** 병합된 댓글 목록 (오래된순 — 서버 계약, 스펙 오탐 방지 ③) */
  comments: EventVideoCommentResponseDto[];
  /** true면 "더 보기" 노출 (AC 7, 추정 5 — Figma에 없는 의도적 추가) */
  hasNext: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}

/**
 * 행사 영상 댓글 목록 (MSG-520 AC 7) — 아바타 폴백(DTO에 프로필 이미지 없음 —
 * 스펙 오탐 방지 ④) + 닉네임 + 상대시간 + 본문 행. 새 댓글은 맨 아래에 붙는다.
 */
export const EventVideoComments = ({
  comments,
  hasNext,
  loadMore,
  isLoadingMore,
}: EventVideoCommentsProps) => {
  if (comments.length === 0) {
    return (
      <p className="py-sm text-center text-fm-caption text-foreground-muted">
        아직 댓글이 없어요. 첫 댓글을 남겨보세요
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-sm">
      <ul className="flex flex-col gap-md">
        {comments.map((comment) => (
          <li key={comment.commentId} className="flex gap-xs">
            <Avatar
              size="sm"
              fallback={comment.authorNickname.slice(0, 1)}
              className="mt-0.5"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-xxs">
              <div className="flex items-baseline gap-xs">
                <span className="truncate text-fm-body-strong text-foreground">
                  {comment.authorNickname}
                </span>
                <span className="shrink-0 text-fm-caption text-foreground-muted">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-fm-body text-foreground">
                {comment.content}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {hasNext && (
        <Button
          text={isLoadingMore ? "불러오는 중" : "더 보기"}
          variant="secondary"
          size="sm"
          disabled={isLoadingMore}
          onClick={loadMore}
          className="w-full"
        />
      )}
    </div>
  );
};
