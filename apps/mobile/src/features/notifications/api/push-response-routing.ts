import type { Href } from "expo-router";
import { pushRouteFor } from "../model/notification-route";

/**
 * 푸시 탭 응답 → 화면 이동 오케스트레이션 (MSG-605 L3, FR-7). 네이티브·라우터를 주입받는 순수 모듈.
 *
 * - **중복 제거**: Android는 앱을 띄운 탭이 listener와 last response 양쪽으로 올 수 있어 요청 id로 1회만.
 * - **게이트 대기**: 콜드 스타트는 세션 재수화·약관 게이트·index의 `/home` Redirect가 끝난 뒤에 움직여야
 *   한다(먼저 push하면 Redirect가 덮는다). `ready`가 false면 마지막 1건만 보류하고 ready 때 이동한다.
 * - **대상 없음·훼손 → 홈**: `pushRouteFor`가 접는다. 앱은 죽지 않는다 (FR-10).
 * - **세션 경계**: 라우터는 앱 수명 동안 하나라 사용자를 모른다. `ready`가 한 번 true였다가 false로 내려간
 *   뒤(로그아웃·약관 게이트)에는 보류분을 버리고 **새 탭도 보류하지 않는다** — A가 로그아웃한 뒤 도착한
 *   탭을 B의 세션에서 여는 창을 닫는다(PR #161 리뷰, `aiRouteStore.resetForSessionEnd` 선례와 같은 부류).
 *   보류는 **최초 기동(아직 ready였던 적 없음)** 에만 허용한다 — 콜드 스타트 탭은 게이트가 열리면 이동한다.
 */
export interface PushResponse {
  /** 알림 요청 식별자 — 중복 제거 키 */
  id: string;
  /** FCM `data` (문자열 맵) — notificationId·category·targetType·targetId */
  data: Record<string, unknown> | null | undefined;
}

export interface PushResponseDeps {
  navigate: (href: Href) => void;
  now: () => number;
}

export interface PushResponseRouter {
  /** listener·last response 공통 입구 */
  handle: (response: PushResponse) => void;
  /** 게이트 상태 갱신 — true가 되면 보류분을 이동시킨다 */
  setReady: (ready: boolean) => void;
}

export const createPushResponseRouter = (
  deps: PushResponseDeps,
): PushResponseRouter => {
  const handled = new Set<string>();
  let ready = false;
  /** 세션이 한 번 열렸다 닫힌 뒤 — 이후 not-ready 구간의 탭은 보류하지 않고 버린다 */
  let sessionEnded = false;
  let pending: PushResponse | null = null;

  const go = (response: PushResponse): void => {
    handled.add(response.id);
    deps.navigate(pushRouteFor(response.data, deps.now()));
  };

  return {
    handle: (response) => {
      if (handled.has(response.id) || pending?.id === response.id) return;
      if (!ready) {
        // 최초 기동 전에만 보류(마지막 탭만 의미가 있다). 세션 종료 뒤 탭은 다음 사용자 것이 아니다
        if (!sessionEnded) pending = response;
        return;
      }
      go(response);
    },
    setReady: (next) => {
      const wasReady = ready;
      ready = next;
      if (!ready) {
        if (wasReady) sessionEnded = true; // 세션 경계 — 이후 보류 금지
        pending = null;
        return;
      }
      sessionEnded = false; // 새 세션 — 이 시점부터의 탭은 이 사용자 것
      if (pending === null) return;
      const response = pending;
      pending = null;
      go(response);
    },
  };
};
