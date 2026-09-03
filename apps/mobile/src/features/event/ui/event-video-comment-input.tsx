import { Pressable, View } from "react-native";
import { Send } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Input, cx } from "@fillmap/ui-native";

/**
 * 댓글 입력 footer (MSG-562 D6·D9, Figma 15794:822 `comment-input`) — 시트 콘텐츠의 마지막
 * 형제(스크롤 밖)라 1단계에서 탭바 바로 위에 고정된다(추정 A2). 웹 `EventVideoCommentInput.tsx`
 * 참조본 — 전송은 Figma대로 아이콘 버튼(`send`), 게이트(잠금·판정·진행 중)는 배선 훅이 소유한다.
 */
interface EventVideoCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  /** 상세 interactionLocked — 입력 비활성 + 잠금 placeholder */
  disabled: boolean;
  placeholder: string;
  submitDisabled: boolean;
}

export const EventVideoCommentInput = ({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  submitDisabled,
}: EventVideoCommentInputProps) => (
  <View className="flex-row items-center gap-xs border-t border-border pt-sm">
    <View className="flex-1">
      <Input
        accessibilityLabel="댓글 입력"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={500}
        returnKeyType="send"
        onSubmitEditing={onSubmit}
        className="h-10 bg-surface"
      />
    </View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="댓글 전송"
      accessibilityState={{ disabled: submitDisabled }}
      disabled={submitDisabled}
      onPress={onSubmit}
      hitSlop={4}
      className={cx(
        "size-10 items-center justify-center rounded-full bg-primary active:opacity-80",
        submitDisabled && "opacity-50",
      )}
    >
      <Send size={18} color={semantic.onPrimary} />
    </Pressable>
  </View>
);
