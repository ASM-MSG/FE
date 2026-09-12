import { Pressable, Text, View } from "react-native";
import { Avatar } from "@fillmap/ui-native";
import type { EventVideoCommentResponseDto } from "../../../shared/api/sdk";
import { formatRelativeTime } from "../../../shared/format";

/**
 * 댓글 행 (MSG-562 D5, Figma 15794:822 `comments`) — 아바타 폴백(첫 글자, DTO에 프로필
 * 이미지 없음 — 오탐 방지 5) + 닉네임 + 상대시간(우측) + 본문. 웹 `EventVideoComments.tsx` 참조본.
 * **길게 누르기**(MSG-570 기준 10) — `onLongPress`가 있을 때만 Pressable이고(타인 댓글),
 * 스크린리더에는 같은 동작을 접근성 액션 "longpress"로 노출한다. 내 댓글은 `onLongPress`가
 * 없어 평범한 View다.
 */
interface EventVideoCommentRowProps {
  comment: EventVideoCommentResponseDto;
  onLongPress?: () => void;
}

export const EventVideoCommentRow = ({
  comment,
  onLongPress,
}: EventVideoCommentRowProps) => (
  <Pressable
    // 내 댓글은 핸들러가 없어 종전 View와 같게 낭독된다 — disabled로 잠그면 "사용 안 함"이 읽힌다
    accessible={onLongPress !== undefined}
    onLongPress={onLongPress}
    accessibilityActions={
      onLongPress === undefined
        ? undefined
        : [{ name: "longpress", label: "사용자 차단" }]
    }
    onAccessibilityAction={(event) => {
      if (event.nativeEvent.actionName === "longpress") onLongPress?.();
    }}
    className="flex-row gap-xs"
  >
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
  </Pressable>
);
