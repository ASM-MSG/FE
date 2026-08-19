import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toast } from "@fillmap/ui-native";
import { HOME_TOP_BAR_HEIGHT } from "../model/themes";

/**
 * 지역 집계 조회 실패 안내 (MSG-428 S7, 승인 Q7) — 지도 위 오버레이 한 개.
 * 시트 상태(`deriveSheetState`)에 넣지 않는다: 집계 실패로 시트가 접히거나 격자 목록이
 * 사라지면 "격자 화면이 잠기지 않는다"는 요구가 깨진다. 마커만 없고 지도는 그대로
 * 조작 가능한 상태에서, 탭 한 번으로 재시도만 제공한다.
 *
 * 화면 로컬 컴포넌트 — ui-native `Toast`(dark)를 위치·재시도만 감싸는 얇은 배치층이다.
 *
 * 세로 위치는 safe-area + 상단 바 실높이로 잡는다 (PR #76 리뷰 반영): 고정 오프셋
 * `top-32`(128px)는 노치·상태바가 있는 전 기기에서 칩 행(insets.top+110 이하)을 덮고
 * 그 영역의 탭까지 가로챘다. safe-area는 여기서 직접 읽는다 — prop 주입 기각(MSG-420)은
 * `packages/ui-native`에 safe-area-context 의존을 늘리지 않겠다는 패키지 한정 결정이라
 * 화면 로컬 컴포넌트에는 적용되지 않고, grid-detail `more-menu-sheet` 등 선례가 있다.
 */
interface ClusterErrorNoticeProps {
  onRetry: () => void;
}

export const ClusterErrorNotice = ({ onRetry }: ClusterErrorNoticeProps) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 px-md"
      style={{ top: insets.top + HOME_TOP_BAR_HEIGHT }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="지역 집계 다시 불러오기"
        onPress={onRetry}
        className="active:opacity-80"
      >
        <Toast
          title="지역 집계를 불러오지 못했어요"
          description="탭하면 다시 시도합니다"
          icon="!"
        />
      </Pressable>
    </View>
  );
};
