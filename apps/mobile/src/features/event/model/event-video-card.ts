import type { EventLocationVideoResponseDto } from "../../../shared/api/sdk";
import { formatDuration, formatRelativeTime } from "../../../shared/format";

/**
 * 위치 현장 영상 카드 뷰 파생 (MSG-560 D5) — 웹 `EventVideoCard.tsx`의 표시 규칙을
 * 뷰에서 분리한 순수 함수. DTO에 제목·닉네임·조회수가 없어(서버 계약) 첫 줄은
 * `♥ N · 댓글 M`, 둘째 줄은 상대시간이고 접근명은 상대시간으로 카드를 구분한다.
 */
export interface EventVideoCardView {
  videoId: number;
  thumbnailUrl: string;
  /** `0:05` — ui-native VideoCard는 포맷된 문자열을 받는다 */
  durationLabel: string;
  countsLine: string;
  timeLabel: string;
  accessibilityLabel: string;
}

/** 응답(최신순) 순서를 그대로 유지한다 — 정렬은 서버 정본 */
export const toEventVideoCardViews = (
  videos: EventLocationVideoResponseDto[],
  now?: Date,
): EventVideoCardView[] =>
  videos.map((video) => {
    const timeLabel = formatRelativeTime(video.createdAt, now);
    return {
      videoId: video.videoId,
      thumbnailUrl: video.thumbnailUrl,
      durationLabel: formatDuration(video.durationSec),
      countsLine: `♥ ${video.helpfulCount} · 댓글 ${video.commentCount}`,
      timeLabel,
      accessibilityLabel: `행사 영상 재생 — ${timeLabel}`,
    };
  });
