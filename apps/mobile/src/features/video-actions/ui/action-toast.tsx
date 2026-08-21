import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toast } from "@fillmap/ui-native";

interface ActionToastProps {
  /** 표시 문구 — null이면 렌더하지 않는다 (자동 소멸은 useAutoDismissToast가 관리) */
  message: string | null;
  onDismiss: () => void;
}

/**
 * 영상 액션 실패 안내 토스트 (MSG-431 S5·S9) — 화면 하단 오버레이.
 *
 * RN `Modal`로 띄우는 이유: 이 토스트는 **다른 Modal(액션시트·확인 다이얼로그)이 열렸다
 * 닫힌 직후**나 **다이얼로그가 열린 채** 떠야 하는데, 호스트 트리에 그리면 Modal 창 뒤에
 * 가려지거나(다이얼로그 유지 경로) 카드 지역 좌표에 갇힌다(갤러리 카드는 ScrollView 깊숙이
 * 있다). 별도 Modal이면 두 경우 모두 화면 하단에 정확히 뜬다.
 *
 * Modal 창은 Android에서 화면 전체 터치를 잡으므로 **탭하면 즉시 사라진다** — 3초 동안
 * 사용자 입력을 삼키지 않기 위한 처리이며, 토스트 탭 해제는 표준 어포던스이기도 하다.
 * (호스트 트리에 그리면서 터치를 통과시키는 방법은 RN Modal 경계상 성립하지 않는다 —
 * 토스트 호스트 라이브러리 도입은 단일 티켓 범위를 넘어 기각했다.)
 */
export const ActionToast = ({ message, onDismiss }: ActionToastProps) => {
  const insets = useSafeAreaInsets();
  if (message === null) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="안내 닫기"
        onPress={onDismiss}
        className="flex-1 justify-end"
      >
        <View className="px-md" style={{ paddingBottom: insets.bottom + 16 }}>
          <Toast title={message} />
        </View>
      </Pressable>
    </Modal>
  );
};
