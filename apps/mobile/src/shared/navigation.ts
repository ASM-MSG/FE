import { router, type Href } from "expo-router";

/**
 * 네비게이션 어댑터 (AC 7) — RN 경계 규칙의 지정 경유지.
 * 모델(auth-store·configure-auth)은 expo-router를 직접 import하지 않고 이 어댑터를
 * 콜백으로 주입받는다 (웹 shared/navigation.ts 선례). 라우터 교체 시 이 파일만 바뀐다.
 */

/** 세션 만료 시 로그인 화면으로 보낸다 — 만료된 화면으로 되돌아갈 수 없게 replace를 쓴다 */
export const goToLogin = (): void => {
  router.replace("/login");
};

/**
 * 임의 경로 이동 (MSG-429 기준 11·16) — 알림 통지·푸시 탭처럼 **목적지를 모델이 문자열로
 * 정하는** 경로에 쓴다. `typedRoutes`가 켜져 있어 리터럴이 아닌 문자열은 `Href`로 좁혀야
 * 하는데, 여기 오는 값은 전부 `blur-entry`의 생성기가 만든 것이라 형태가 고정돼 있다.
 * 캐스팅을 이 어댑터 한 곳에 가둬 화면·훅에 번지지 않게 한다.
 */
export const goToRoute = (route: string): void => {
  router.navigate(route as Href);
};

/**
 * 영상 재생 화면으로 (MSG-446 기준 8) — 진입점 4곳(지도 홈 시트·격자 상세·도감 갤러리·
 * 미션 상세)이 **같은 목적지**로 들어가도록 라우트 리터럴을 이 한 곳에 가둔다.
 * `push`라 직전 화면이 마운트된 채 남아 뒤로 갔을 때 목록 스크롤이 유지된다 (기준 9).
 *
 * `mine`은 **표기용 신호일 뿐 접근 판정에 쓰지 않는다** (기준 12) — 비공개·삭제 차단은
 * 서버가 403·404로 내리고 화면은 그것만 반영한다 (`playbackAccessNotice`).
 */
export const goToVideoPlayback = (videoId: number, mine: boolean): void => {
  router.push({
    pathname: "/video/[videoId]",
    params: { videoId: String(videoId), mine: mine ? "1" : "0" },
  });
};
