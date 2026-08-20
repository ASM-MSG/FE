import { resolveBlurPushRoute } from "../../upload/model/blur-entry";

/**
 * 알림 탭 → 화면 이동 오케스트레이션 (MSG-429 기준 16).
 *
 * 어댑터를 주입받는다 — `expo-notifications`를 직접 물면 vitest가 파싱 단계에서 죽고
 * (스펙 R6), 무엇보다 **네이티브 모듈 부재 내성**을 검증할 수단이 사라진다.
 *
 * **네이티브 모듈 부재 내성 (2026-08-19 실기 환류)**: 실기에서 `expo-notifications`가
 * 링크되지 않은 APK가 나왔고, 어댑터의 **import 문 자체**가 던지자
 * (`Cannot find native module 'ExpoPushTokenManager'`, 스택 최상단이
 * `notifications-adapter.ts:3:1`) 그 파일을 간접 import하는 `_layout.tsx`가 통째로 평가
 * 실패했다 — "Route ./_layout.tsx is missing the required default export". 앱 전체가 죽는다.
 * 이 저장소는 **구 dev client APK와 새 JS가 어긋나는 상황이 반복**되므로(MSG-423·425 이력)
 * 어댑터를 동적 로드로 격리하고, 세 접점(핸들러 등록·콜드 스타트 조회·탭 구독)을 각각
 * 삼켜 "푸시 없음"까지만 퇴화시킨다. 인앱 통지(기준 9·11)는 그 상태에서도 그대로 동작한다.
 */
export interface PushNavigationDeps {
  /** 포그라운드 배너 표시 설정 — 최초 1회 (네이티브 모듈 접촉 지점) */
  ensureForegroundHandler: () => Promise<void>;
  /** 앱이 종료된 상태에서 알림으로 실행됐을 때의 최초 응답 payload */
  readLastNotificationData: () => Promise<unknown>;
  /** 실행 중 알림 탭 구독 — 해지 함수를 돌려준다 */
  subscribeToTaps: (onTap: (data: unknown) => void) => Promise<() => void>;
}

/**
 * 라우팅을 시작하고 정리 함수를 돌려준다. 콜드 스타트와 실행 중 탭 두 경로를 모두 덮는다 —
 * 구독만 두면 마운트 이전의 탭(=앱을 켠 그 알림)이 통째로 누락된다.
 *
 * 어댑터가 비동기라 구독이 정리 이후에 도착할 수 있다. 그때는 **받자마자 해지**한다
 * (`alive` 가드) — 안 그러면 언마운트된 화면으로 라우팅하는 누수가 남는다.
 */
export const startNotificationRouting = (
  deps: PushNavigationDeps,
  navigate: (route: string) => void,
): (() => void) => {
  let alive = true;
  let unsubscribe: (() => void) | null = null;

  const swallow = () => {
    // 네이티브 모듈 부재·권한 미비 = 푸시 없음. 앱은 계속 뜬다
  };

  void deps.ensureForegroundHandler().catch(swallow);

  const open = (data: unknown) => {
    if (!alive) return;
    const route = resolveBlurPushRoute(data);
    if (route !== null) navigate(route);
  };

  void deps.readLastNotificationData().then(open, swallow);

  void deps.subscribeToTaps(open).then((off) => {
    if (alive) unsubscribe = off;
    else off();
  }, swallow);

  return () => {
    alive = false;
    try {
      unsubscribe?.();
    } catch {
      // 해지 실패는 정리 경로라 삼킨다
    }
  };
};
