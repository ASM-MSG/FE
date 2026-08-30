import { Toast } from "@fillmap/ui-web";
import { useState } from "react";
import { useAiRouteStore } from "@/features/ai-route/model/ai-route-store";
import {
  MOVED_TOAST_DESCRIPTION,
  movedToastTitle,
} from "@/features/ai-route/model/route-mentioned-area";
import { useAutoDismissToast } from "@/features/video-actions/model/use-auto-dismiss-toast";

/**
 * 언급 지역 자동 이동 안내 토스트 (Figma 15675:3267 — MSG-489 D3).
 * 지도 상단 중앙(패널 오른쪽 영역의 가운데)에 뜨고 3초 뒤 사라진다.
 * ui-web `Toast`(dark)를 무수정 재사용하고, 소멸 타이머는 기존 `useAutoDismissToast`가 맡는다.
 *
 * 이동 사실의 정본은 스토어(`movedAreaName`)이고 이 호스트는 그 **전이**에만 반응한다 —
 * 섹션을 나갔다 돌아왔다고 이미 지나간 토스트를 다시 띄우지 않는다 (A7).
 */
export const RouteToastHost = () => {
  const movedAreaName = useAiRouteStore((s) => s.movedAreaName);
  const [message, setMessage] = useAutoDismissToast();
  // 마운트 시점의 값은 이미 소비된 이동으로 본다
  const [seen, setSeen] = useState<string | null>(
    () => useAiRouteStore.getState().movedAreaName,
  );

  // 렌더 중 파생 동기화(React 공식 "props가 바뀔 때 state 조정" 패턴) — 이펙트로 쓰면
  // `setMessage`가 매 렌더 새 참조라 의존성에 넣는 순간 소멸 타이머가 계속 재시작된다.
  if (movedAreaName !== seen) {
    setSeen(movedAreaName);
    if (movedAreaName !== null) setMessage(movedToastTitle(movedAreaName));
  }

  if (message === null) return null;

  return (
    <div className="pointer-events-none absolute left-97 right-0 top-21 z-20 flex justify-center px-5">
      <Toast
        className="w-85.5"
        title={message}
        description={MOVED_TOAST_DESCRIPTION}
      />
    </div>
  );
};
