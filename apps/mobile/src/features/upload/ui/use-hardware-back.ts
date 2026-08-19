import { useEffect } from "react";
import { BackHandler } from "react-native";

/**
 * 안드로이드 하드웨어/제스처 백을 화면의 이탈 경로로 태우는 **뷰-레이어 훅** (기준 22·36).
 * RN 재사용 대상이 아니다 — 플랫폼 백 이벤트에 직접 붙는다.
 *
 * 업로드 플로우의 이탈은 스토어 정리(`backToHighlight`/`backToSelect`)를 반드시 거쳐야 한다.
 * 백이 이 정리를 우회하면 사용자는 이전 화면을 보는데 영속 스텝은 그대로 남아, 재시작이
 * 예기치 않게 그 화면으로 재개되고 낡은 확정 진행을 재사용한다(codex 리뷰 3회차 P2).
 * 분석 중 화면이 백을 막는 것(기준 4)과 같은 결의 처리이며, 그쪽은 "막기"·여기는 "태우기"다.
 *
 * **한계**: iOS 스와이프 백은 이 이벤트를 발생시키지 않는다 — 네비게이터 옵션
 * (`gestureEnabled: false`)이 필요하고 이번 범위에서 확인하지 못했다(빌드 리포트 미해결 항목).
 */
export const useHardwareBack = (onBack: () => void): void => {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBack();
        // true = 기본 뒤로가기를 소비한다. 이동은 onBack이 직접 수행한다
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack]);
};
