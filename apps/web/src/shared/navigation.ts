/**
 * 외부 이동 어댑터 (MSG-325) — RN 경계 규칙의 지정 경유지.
 * 앱 내부 이동은 라우터(useNavigate)가 담당하고, 여기는 **라우터 밖 문서 이동** —
 * 외부 출처로 나가는 이동과, 의도적 문서 리로드가 필요한 내부 하드 이동
 * (RouteErrorBoundary, MSG-477 ②) — 만 다룬다. RN 확장 시 이 파일만 Linking.openURL
 * 구현으로 교체한다.
 * `shared/geolocation.ts`와 같은 층위의 플랫폼 어댑터다.
 */

/** 현재 문서를 외부 URL로 이동시킨다 — 히스토리 항목을 남긴다(뒤로가기로 복귀 가능) */
export const redirectTo = (url: string): void => {
  window.location.assign(url);
};

/**
 * 새 탭으로 URL을 연다 (MSG-554) — 현재 문서를 유지해야 하는 이동용.
 * 관리자 콘솔의 "지도에서 보기"가 유저 지도를 열면서 콘솔 화면을 남겨 둔다.
 * `noopener`는 새 탭이 `window.opener`로 콘솔 문서를 만지지 못하게 막는다.
 */
export const openInNewTab = (url: string): void => {
  window.open(url, "_blank", "noopener");
};

/** 앱의 현재 출처(scheme + host + port) — OAuth 콜백 URI 조립에 쓴다 */
export const appOrigin = (): string => window.location.origin;
