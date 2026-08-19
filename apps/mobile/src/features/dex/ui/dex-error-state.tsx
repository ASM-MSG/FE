import { Text, View } from "react-native";
import { Button } from "@fillmap/ui-native";

interface DexErrorStateProps {
  title: string;
  /** 보조 문구 — 생략하면 제목 + 버튼만 (탭 단위 실패용 축약형) */
  description?: string;
  onRetry: () => void;
}

/**
 * 도감 조회 실패 + 재시도 (MSG-425 S11) — 제목 + 보조 문구 + "다시 시도" 버튼.
 * 웹 `DexErrorState`·`GalleryErrorState`와 같은 패턴이며 문구도 승계한다(추정 A7).
 *
 * **[공용] MSG-430·MSG-431도 이 컴포넌트를 재사용한다** — 도메인 문구를 갖지 않는 형태라
 * 사용처가 3곳을 넘으면 `ui-native` 승격을 검토한다(이 티켓에서는 도감 전용이라 로컬).
 */
export const DexErrorState = ({
  title,
  description,
  onRetry,
}: DexErrorStateProps) => (
  <View className="items-center gap-md py-xl">
    <View className="items-center gap-xxs">
      <Text className="text-fm-title text-foreground">{title}</Text>
      {description !== undefined && (
        <Text className="text-center text-fm-body text-foreground-muted">
          {description}
        </Text>
      )}
    </View>
    <Button text="다시 시도" variant="primary" size="sm" onPress={onRetry} />
  </View>
);
