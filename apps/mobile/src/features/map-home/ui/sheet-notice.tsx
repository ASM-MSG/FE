import { Text, View } from "react-native";
import { Button } from "@fillmap/ui-native";

/**
 * 목록 위에 얹는 부분 실패 안내 (MSG-427 D13) — 목록은 멀쩡한데 **부재료**만 실패한
 * 경우의 자리다. 목록 전체를 가리는 `SheetStatusView`(error)와 역할이 다르다:
 * 진행도 실패를 목록 실패로 뭉치면 멀쩡한 목록이 사라지고 메시지도 틀린다.
 */
interface SheetNoticeProps {
  message: string;
  onRetry: () => void;
}

export const SheetNotice = ({ message, onRetry }: SheetNoticeProps) => (
  <View className="flex-row items-center gap-sm rounded-sm bg-surface px-sm py-xs">
    <Text className="flex-1 text-fm-label text-foreground-muted">
      {message}
    </Text>
    <Button text="다시 시도" size="sm" onPress={onRetry} />
  </View>
);
