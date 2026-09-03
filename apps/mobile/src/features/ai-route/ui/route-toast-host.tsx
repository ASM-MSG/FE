import { useState } from "react";
import { View } from "react-native";
import { Toast } from "@fillmap/ui-native";
import { useAutoDismissToast } from "../../video-actions/model/use-auto-dismiss-toast";
import { aiRouteStore, useAiRouteState } from "../model/ai-route-store";
import {
  MOVED_TOAST_DESCRIPTION,
  movedToastTitle,
} from "../model/route-mentioned-area";

/**
 * 언급 지역 자동 이동 안내 토스트 (Figma 15751:553 — MSG-559 §6 A5).
 * ← 버튼 바로 아래에 뜨고 3초 뒤 사라진다. ui-native `Toast`(dark)를 무수정 재사용하고
 * 소멸 타이머는 기존 `useAutoDismissToast`(3초)가 맡는다. `pointerEvents="none"`이라
 * 토스트가 떠 있는 동안에도 탭이 지도로 통과한다.
 *
 * 이동 사실의 정본은 스토어(`movedAreaName`)이고 이 호스트는 그 **전이**에만 반응한다 —
 * 탭을 나갔다 돌아온 재마운트에서 이미 지나간 토스트를 다시 띄우지 않는다.
 */
export const RouteToastHost = ({ topOffset }: { topOffset: number }) => {
  const { movedAreaName } = useAiRouteState();
  const [message, setMessage] = useAutoDismissToast();
  // 마운트 시점의 값은 이미 소비된 이동으로 본다
  const [seen, setSeen] = useState<string | null>(
    () => aiRouteStore.getState().movedAreaName,
  );

  // 렌더 중 파생 동기화(React 공식 "props가 바뀔 때 state 조정" 패턴) — 이펙트로 쓰면
  // `setMessage`가 매 렌더 새 참조라 의존성에 넣는 순간 소멸 타이머가 계속 재시작된다
  if (movedAreaName !== seen) {
    setSeen(movedAreaName);
    if (movedAreaName !== null) setMessage(movedToastTitle(movedAreaName));
  }

  if (message === null) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 px-md"
      style={{ top: topOffset }}
    >
      <Toast title={message} description={MOVED_TOAST_DESCRIPTION} />
    </View>
  );
};
