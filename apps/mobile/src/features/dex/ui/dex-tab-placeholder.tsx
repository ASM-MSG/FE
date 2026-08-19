import { Text, View } from "react-native";

interface DexTabPlaceholderProps {
  /** 탭 표시 라벨 (예: "기록") */
  label: string;
}

/**
 * 탭 본문 자리표시 (MSG-425 요구 ② — 기록 탭은 이 티켓에서 껍데기까지만).
 *
 * **[MSG-430 교체 지점] 기록 탭 본문(업로드 잔디)이 들어오면 `dex-screen`의 렌더
 * 스위치에서 이 컴포넌트를 `RecordTabBody`로 바꾸고 이 파일을 삭제한다.**
 */
export const DexTabPlaceholder = ({ label }: DexTabPlaceholderProps) => (
  <View className="items-center py-xl">
    <Text className="text-fm-body text-foreground-muted">
      {label} 탭은 준비 중이에요
    </Text>
  </View>
);
