import type { CellVideo } from "@/entities/cell";
import { formatMonthDay, formatRelativeTime } from "@/shared/format";

interface VideoOwnerMetaProps {
  video: CellVideo;
  /** 내 영상 여부 — 문구 분기: 내 영상 "내 영상 · M월 D일" / 다른 사용자 "@핸들 · 상대시간" */
  mine: boolean;
}

/**
 * 영상 소유 메타 한 줄 (MSG-277 AC 4·5) — FeedVideoCard·VideoMiniPanel 공용.
 * 카드와 그 카드로 연 미니 패널이 같은 영상의 동일 표기를 보여야 해서 분기를 한곳에 둔다 (리뷰 반영).
 */
export const VideoOwnerMeta = ({ video, mine }: VideoOwnerMetaProps) =>
  mine ? (
    <span className="min-w-0 truncate text-fm-caption text-foreground-muted">
      <span className="text-fm-body-strong text-primary">내 영상</span>
      {` · ${formatMonthDay(video.uploadedAt)}`}
    </span>
  ) : (
    <span className="min-w-0 truncate text-fm-caption text-foreground-muted">
      {video.uploaderHandle && (
        <span className="text-fm-body-strong text-foreground">
          {video.uploaderHandle}
        </span>
      )}
      {video.uploaderHandle
        ? ` · ${formatRelativeTime(video.uploadedAt)}`
        : formatRelativeTime(video.uploadedAt)}
    </span>
  );
