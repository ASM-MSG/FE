import { Text, View } from "react-native";
import { Avatar } from "@fillmap/ui-native";
import type { EventVideoCommentResponseDto } from "../../../shared/api/sdk";
import { formatRelativeTime } from "../../../shared/format";

/**
 * 댓글 행 (MSG-562 D5, Figma 15794:822 `comments`) — 아바타 폴백(첫 글자, DTO에 프로필
 * 이미지 없음 — 오탐 방지 5) + 닉네임 + 상대시간(우측) + 본문. 웹 `EventVideoComments.tsx` 참조본.
 */
interface EventVideoCommentRowProps {
  comment: EventVideoCommentResponseDto;
}

export const EventVideoCommentRow = ({
  comment,
}: EventVideoCommentRowProps) => (
  <View className="flex-row gap-xs">
    <Avatar size="sm" fallback={comment.authorNickname.slice(0, 1)} />
    <View className="flex-1 gap-xxs">
      <View className="flex-row items-center justify-between gap-xs">
        <Text
          numberOfLines={1}
          className="shrink text-fm-body-strong text-foreground"
        >
          {comment.authorNickname}
        </Text>
        <Text className="text-fm-caption text-foreground-muted">
          {formatRelativeTime(comment.createdAt)}
        </Text>
      </View>
      <Text className="text-fm-body text-foreground">{comment.content}</Text>
    </View>
  </View>
);
