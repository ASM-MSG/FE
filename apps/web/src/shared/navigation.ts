/**
 * 외부 이동 어댑터 (MSG-325) — RN 경계 규칙의 지정 경유지.
 * 앱 내부 이동은 라우터(useNavigate)가 담당하고, 여기는 **앱 밖(외부 출처)으로 나가는**
 * 이동만 다룬다. RN 확장 시 이 파일만 Linking.openURL 구현으로 교체한다.
 * `shared/geolocation.ts`와 같은 층위의 플랫폼 어댑터다.
 */

/** 현재 문서를 외부 URL로 이동시킨다 — 히스토리 항목을 남긴다(뒤로가기로 복귀 가능) */
export const redirectTo = (url: string): void => {
  window.location.assign(url);
};

/** 앱의 현재 출처(scheme + host + port) — OAuth 콜백 URI 조립에 쓴다 */
export const appOrigin = (): string => window.location.origin;
