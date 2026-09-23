import { palette, semantic } from "@fillmap/design-tokens";

/**
 * 로그인 히어로 셔터 버튼 — SOURCE: Figma "소셜 로그인 · A-1 찍는 순간 점령" (node 16026:466) 하위
 * shutter의 SVG export (MSG-601). 파란 원 + 흰 링 + 카메라 글리프.
 * 재생성: export 루트의 preserveAspectRatio·width·height·style·`id`를 지우고, 그림자 `<filter>`와
 * `<defs>`를 통째로 제거한 뒤(react-native-svg 15의 filter 지원이 부분적 — 그림자는 래퍼 `shadow-fab`
 * 으로, A9) 그림자 여백을 뺀 `viewBox="14 8 72 72"`만 남긴다. 색은 #0066CC → primary · white →
 * palette.white 2종만 토큰으로 보간한다(MSG-590 관례).
 */
export const SHUTTER_ART_XML = `<svg viewBox="14 8 72 72" fill="none" xmlns="http://www.w3.org/2000/svg"><g><rect x="20" y="14" width="60" height="60" rx="30" fill="${semantic.primary}"/><rect x="18" y="12" width="64" height="64" rx="32" stroke="${palette.white}" stroke-width="4"/><rect x="45" y="31" width="10" height="6" rx="2" fill="${palette.white}"/><rect x="37" y="35" width="26" height="20" rx="5" fill="${palette.white}"/><circle cx="50" cy="45" r="5.5" fill="${semantic.primary}"/><circle cx="50" cy="45" r="2.5" fill="${palette.white}"/></g></svg>`;
