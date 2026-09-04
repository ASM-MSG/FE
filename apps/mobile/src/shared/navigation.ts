import { router } from "expo-router";

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

/**
 * 약관 전문 화면으로 (MSG-448 기준 5·17) — 진입점 3곳(프로필 설정 2행 + 동의 관리 화면의
 * "보기")이 같은 목적지로 들어가도록 라우트 리터럴을 여기 하나에 가둔다.
 * 회원가입 동의 게이트는 이 경로를 쓰지 않는다 — 게이트가 `Stack` 자체를 대체해 라우터가
 * 없고, 이동 경로를 만들면 그것이 곧 잠금이 새는 구멍이기 때문이다(전면 뷰로 직접 렌더).
 *
 * 문서 키는 `entities/terms`의 `TermsDocKey`지만 여기서는 `string`으로 받는다 — shared는
 * 최하위 레이어라 상위(entities) 타입을 참조하면 의존 방향이 뒤집힌다.
 */
export const goToTermsDocument = (docKey: string): void => {
  router.navigate({ pathname: "/terms/[docKey]", params: { docKey } });
};
