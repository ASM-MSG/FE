import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import {
  addPushResponseListener,
  clearLastPushResponse,
  readLastPushResponse,
  type PushResponseEvent,
} from "./notifications-adapter";
import { createPushResponseRouter } from "./push-response-routing";

/**
 * 푸시 탭 → 화면 이동 배선 (MSG-605 FR-7) — 앱 셸 상주. 판정·중복 제거·게이트 대기는
 * `push-response-routing`이 소유하고 여기는 네이티브 어댑터와 라우터를 묶어 넣는다.
 *
 * 콜드 스타트는 마운트 시 `readLastPushResponse` 1회로 잡고 처리 뒤 지운다(다음 기동에 다시
 * 열리지 않게). 어댑터 실패(네이티브 모듈 부재·권한 미비)는 삼킨다 — 푸시 없음까지만 퇴화.
 */
export const usePushResponseRouting = (ready: boolean): void => {
  const router = useRouter();
  const latestRouter = useRef(router);
  latestRouter.current = router;
  const pushRouter = useRef(
    createPushResponseRouter({
      navigate: (href) => latestRouter.current.navigate(href),
      now: Date.now,
    }),
  ).current;

  useEffect(() => {
    pushRouter.setReady(ready);
  }, [pushRouter, ready]);

  useEffect(() => {
    let cancelled = false;
    let remove: (() => void) | null = null;
    // 실행 중 탭도 처리 뒤 지운다 — 안 지우면 다음 콜드 스타트의 last response로 다시 읽혀 재이동한다(실측)
    const handleAndClear = (response: PushResponseEvent) => {
      pushRouter.handle(response);
      void clearLastPushResponse().catch(() => {});
    };
    void addPushResponseListener(handleAndClear)
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else remove = unsubscribe;
      })
      .catch(() => {});
    void readLastPushResponse()
      .then((response) => {
        if (response === null) return;
        pushRouter.handle(response);
        return clearLastPushResponse();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [pushRouter]);
};
