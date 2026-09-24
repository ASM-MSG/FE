import type { Href } from "expo-router";
import { pushRouteFor } from "../model/notification-route";

/**
 * 푸시 탭 응답 → 화면 이동 오케스트레이션 (MSG-605 L3, FR-7). 네이티브·라우터를 주입받는 순수 모듈.
 *
 * - **중복 제거**: Android는 앱을 띄운 탭이 listener와 last response 양쪽으로 올 수 있어 요청 id로 1회만.
 * - **게이트 대기**: 콜드 스타트는 세션 재수화·약관 게이트·index의 `/home` Redirect가 끝난 뒤에 움직여야
 *   한다(먼저 push하면 Redirect가 덮는다). `ready`가 false면 마지막 1건만 보류하고 ready 때 이동한다.
 * - **대상 없음·훼손 → 홈**: `pushRouteFor`가 접는다. 앱은 죽지 않는다 (FR-10).
 * - **세션 경계**: `ready`가 false로 내려가면(로그아웃·약관 게이트) 보류분을 **버린다**. 라우터는 앱 수명
 *   동안 하나라 사용자를 모른다 — A가 로그아웃한 뒤 도착한 탭을 B의 세션에서 여는 창을 닫는다
 *   (PR #161 리뷰, `aiRouteStore.resetForSessionEnd` 선례와 같은 부류). 콜드 스타트의 보류는 마운트 뒤에
 *   쌓이므로 영향이 없다.
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
  let pending: PushResponse | null = null;

  const go = (response: PushResponse): void => {
    handled.add(response.id);
    deps.navigate(pushRouteFor(response.data, deps.now()));
  };

  return {
    handle: (response) => {
      if (handled.has(response.id) || pending?.id === response.id) return;
      if (!ready) {
        pending = response; // 마지막 탭만 의미가 있다 — 이전 보류분은 버린다
        return;
      }
      go(response);
    },
    setReady: (next) => {
      ready = next;
      if (!ready) {
        pending = null; // 세션 경계 — 이전 사용자 앞으로 온 보류분을 다음 사용자에게 열지 않는다
        return;
      }
      if (pending === null) return;
      const response = pending;
      pending = null;
      go(response);
    },
  };
};
