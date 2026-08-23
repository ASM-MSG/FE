import { Pressable, Text, View } from "react-native";

/**
 * 위치정보 동의 관리 화면의 읽기 전용 상태 행 (MSG-448 기준 9·15·17).
 *
 * `setting-rows.tsx`의 `SettingRow`와 다른 행이다 — 이 행은 탭 대상이 아니고(필수 동의는
 * 철회할 수 없다) 우측이 `›`가 아니라 "동의 상태 + 선택적 전문 보기"다. 그 파일을 고치지
 * 않는 이유는 MSG-447이 같은 파일의 토글 행을 동시에 손대고 있어 헝크를 분리하기 위해서다.
 */
interface ConsentStatusRowProps {
  label: string;
  agreed: boolean;
  /** 전문 "보기" — 문서가 없는 행(만 14세)에는 주지 않는다 (기준 17) */
  onViewTerms?: () => void;
}

export const ConsentStatusRow = ({
  label,
  agreed,
  onViewTerms,
}: ConsentStatusRowProps) => (
  <View className="flex-row items-center gap-sm">
    <Text className="text-fm-body text-foreground" numberOfLines={1}>
      {label}
    </Text>
    <View className="h-px flex-1" />
    <Text className="text-fm-label text-foreground-body">
      {agreed ? "동의함" : "미동의"}
    </Text>
    {onViewTerms !== undefined && (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 전문 보기`}
        hitSlop={12}
        onPress={onViewTerms}
      >
        <Text className="text-fm-label text-foreground-muted">보기</Text>
      </Pressable>
    )}
  </View>
);
