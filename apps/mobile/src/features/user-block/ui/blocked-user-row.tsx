import { Text, View } from "react-native";
import { Avatar, Button } from "@fillmap/ui-native";
import type { BlockedUserResponseDto } from "../../../shared/api/sdk";
import { toBlockedUserRowView } from "../model/user-block";

interface BlockedUserRowProps {
  item: BlockedUserResponseDto;
  /** 이 행의 해제 요청이 진행 중 — 버튼 비활성 (기준 15) */
  unblocking: boolean;
  onUnblock: () => void;
}

/**
 * 차단한 사용자 1행 (MSG-570 기준 13) — 아바타(없으면 닉네임 첫 글자) · 닉네임 · 차단일 ·
 * [차단 해제]. 표시 재료는 `toBlockedUserRowView`가 만든다 — 이 행은 배치만 한다.
 * 카드형 행은 신고 관리 행 관례(Figma 시안 없음).
 */
export const BlockedUserRow = ({
  item,
  unblocking,
  onUnblock,
}: BlockedUserRowProps) => {
  const view = toBlockedUserRowView(item);

  return (
    <View className="flex-row items-center gap-sm rounded-md border border-border bg-surface-soft p-md">
      <Avatar
        size="md"
        src={view.avatarUrl}
        alt={view.nickname}
        fallback={view.initial}
      />
      <View className="min-w-0 flex-1 gap-xxs">
        <Text className="text-fm-body text-foreground" numberOfLines={1}>
          {view.nickname}
        </Text>
        <Text className="text-fm-caption text-foreground-muted">
          {view.blockedAt}
        </Text>
      </View>
      <Button
        text="차단 해제"
        variant="secondary"
        size="sm"
        className="border border-border"
        disabled={unblocking}
        onPress={onUnblock}
      />
    </View>
  );
};
