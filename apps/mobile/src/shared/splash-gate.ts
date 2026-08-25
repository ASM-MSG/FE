/**
 * 스플래시 해제 게이트 (MSG-445) — **지도 홈으로 진입할 때만** 지도 첫 렌더까지
 * 스플래시를 유지한다.
 *
 * 종전에는 온보딩 판정·업로드 재수화가 끝나는 즉시 스플래시를 내렸는데, 그 시점에
 * 앱 UI(검색바·칩·시트·바텀 내비)는 다 그려져도 지도 타일은 아직 없어서 지도 자리에
 * 네이버 SDK의 **빈 격자 무늬 플레이스홀더**가 약 1초 노출됐다(2026-08-25 실기 실측 —
 * 앱 코드가 지도 마운트를 늦추는 게 아니라 SDK의 GL 초기화 + 첫 타일 fetch 시간이다).
 *
 * 그래서 해제 시점을 "저장소 판정 완료"에서 "지도 첫 렌더(onInitialized)"로 옮긴다.
 * 다만 지도가 영영 준비되지 않는 경로가 실재하므로(지도 없는 목적지로 이탈, 키 문제로
 * SDK 초기화 실패, 401 → 로그인 replace) **상한 타이머가 있어야 한다** — 상한을 넘으면
 * 스플래시를 무조건 내린다. 스플래시에 갇힌 앱은 느린 진입보다 훨씬 나쁘다.
 *
 * 네이티브(expo-splash-screen)·타이머는 주입받는다 — 이 파일은 순수 로직이라 vitest
 * 대상이고, 실제 결합은 `splash.ts` 어댑터가 한다 (navigation.ts와 같은 경계 규칙).
 */

export interface SplashGateDeps {
  /** 스플래시 내리기 — 게이트가 정확히 한 번만 호출한다 */
  hide: () => void;
  /** ms 뒤 실행 예약 — 취소 함수를 돌려준다 */
  schedule: (fn: () => void, ms: number) => () => void;
}

export interface SplashGate {
  /**
   * 지도 첫 렌더까지 유지 — 지도 홈이 목적지일 때만 부른다.
   * 상한(`timeoutMs`)을 넘기면 스스로 내린다. 이미 내렸거나 이미 대기 중이면 무시한다.
   */
  holdUntilMapReady: () => void;
  /** 즉시 해제 — 지도 준비 완료, 또는 지도가 없는 목적지. 두 번째 호출부터는 무시한다 */
  release: () => void;
}

/**
 * 지도 준비 대기 상한 — 넘으면 스플래시를 내린다 (지도 로딩 실패·조회 무응답 대비).
 *
 * **이 값은 "안전망"이어야지 "상시 발동 경로"가 되면 안 된다.** 초안의 2500ms가 정확히
 * 그 실수였다: 실측에서 `hold()`는 약 700ms(JS 시계)에 걸리고 타일은 약 3190ms에
 * 도착하는데, 상한은 700+2500 = 약 3200ms에 발동한다 — 타일 도착과 **10ms 차이**라
 * 사실상 동전 던지기였고, 상한이 먼저 이기면 이 티켓이 고치려던 "지도 없는 첫 화면"이
 * 그대로 재발한다 (PR #94 리뷰 지적).
 *
 * 실측 기준(2026-08-25, 갤럭시 S25 · 핫스팟 · dev 번들 = 가장 느린 조건):
 * 상한을 60초로 풀고 잰 **자연 해제(타일 첫 표시 + 점령 조회 완료)는 `hold()` 기준
 * 약 2.5초**였다. 8000ms는 그 3배가 넘는 여유이고, 이벤트가 영영 오지 않는 경로에서도
 * 사용자를 8초 넘게 스플래시에 붙잡지 않는다.
 */
export const SPLASH_MAP_TIMEOUT_MS = 8000;

export const createSplashGate = (
  { hide, schedule }: SplashGateDeps,
  timeoutMs: number = SPLASH_MAP_TIMEOUT_MS,
): SplashGate => {
  let released = false;
  let cancelTimeout: (() => void) | null = null;

  const release = () => {
    if (released) return;
    released = true;
    cancelTimeout?.();
    cancelTimeout = null;
    hide();
  };

  return {
    holdUntilMapReady: () => {
      if (released || cancelTimeout !== null) return;
      cancelTimeout = schedule(release, timeoutMs);
    },
    release,
  };
};
