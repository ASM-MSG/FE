/**
 * SOURCE: Figma "FeelMap Design Tokens" (node 13402:687)
 * https://www.figma.com/design/CpqOlgayviFOG0WXTBUfpp/Fill-Map?node-id=13402-687
 *
 * 이 파일이 색상 값의 유일한 출처(single source of truth)다.
 * 값 수정은 Figma 변수를 먼저 바꾼 뒤 여기에 반영한다.
 */

/** 원시(primitive) 토큰 — Figma "FeelMap Primitives" 컬렉션과 1:1. 컴포넌트에서 직접 쓰지 않는 것을 권장 */
export const palette = {
  "blue-500": "#0066CC",
  "cyan-500": "#0071E3",
  "violet-500": "#2997FF",
  "mint-500": "#2997FF",
  "green-500": "#22C55E",
  "amber-500": "#F59E0B",
  "red-500": "#EF4444",
  "navy-900": "#1D1D1F",
  "slate-600": "#333333",
  "slate-400": "#7A7A7A",
  "slate-300": "#D2D2D7",
  "gray-200": "#E0E0E0",
  "gray-100": "#F5F5F7",
  "surface-soft": "#FAFAFC",
  white: "#FFFFFF",
  // 카카오 브랜드 고정색 (MSG-46 소셜 로그인) — Figma 변수 미등록, 컨테이너 fill은
  // node 13686:1508에서 확정(#FEE500, 카카오 브랜드 가이드 표준). 라벨·로고는 kakao/logo(#000000).
  // 브랜드 규정색이라 시맨틱 매핑 없이 원시 토큰으로만 사용한다.
  "kakao-yellow": "#FEE500",
  "kakao-black": "#000000",
  // 지도 홈 테마 필터 색 4종 (MSG-252 A1) — Figma 지도 홈 프레임(13845:6974 계열) 실측값.
  // 기존 error(#EF4444)·success(#22C55E)와 값이 달라 신규 토큰으로 둔다(근사 사용 금지 — 스펙 R2).
  // Figma 변수 미등록 상태의 선등록 — SEED v3(ver 7) 전환 시 값만 교체한다.
  "theme-hot": "#FF3B30",
  "theme-festival": "#AF52DE",
  "theme-popup": "#FF9500",
  "theme-route": "#34C759",
  // 밝은 배경 위 error "텍스트"용 진한 단계 (MSG-317) — red-500(#EF4444)은 흰 배경 대비
  // 3.76:1로 WCAG AA(4.5:1) 미달, 텍스트 용도만 이 값(4.54:1)을 쓴다. 채움(fill) 용도는
  // error(red-500) 유지. Figma 변수 미등록 상태의 선등록(theme-* 선례) — 더보기 메뉴
  // 프레임(14094:4885)은 동일 값으로 동기함.
  "red-600": "#DC2626",
  // 도감 업로드 잔디 5단계 램프의 lv0~3 (MSG-414 A4) — Figma ver 13 잔디 카드
  // (14786:3572·14789:3834) 실측값. lv4는 primary(blue-500 #0066CC)와 정확히 일치해
  // 기존 토큰을 재사용한다. 투명도 근사(primary/25 류)는 실측과 불일치라 기각
  // (근사 사용 금지 — theme-* 선례). Figma 변수 미등록 상태의 선등록(red-600 선례).
  "grass-0": "#EDEFF2",
  "grass-1": "#C7DFF7",
  "grass-2": "#8CBBEF",
  "grass-3": "#4A93E0",
  // 지도 홈 행사 캡슐 연블루 (MSG-516 AC 3·5) — Figma 연결 캡슐 시안(15806:3654) 실측값.
  // 캡슐 접힘 배경·열림 세그먼트 틴트 공용. 투명도 근사(primary/10 류)는 실측과 불일치라
  // 기각(근사 사용 금지 — theme-*·grass-* 선례). Figma 변수 미등록 상태의 선등록.
  "event-tint": "#E8F5FF",
} as const;

/** 시맨틱 토큰 — Figma "FeelMap Color" 컬렉션과 1:1. 컴포넌트에서는 이것을 우선 사용 */
export const semantic = {
  /** color/primary → blue-500 */
  primary: palette["blue-500"],
  /** color/secondary → cyan-500 */
  secondary: palette["cyan-500"],
  /** color/success → green-500 */
  success: palette["green-500"],
  /** color/accent → violet-500 */
  accent: palette["violet-500"],
  /** color/highlight → mint-500 */
  highlight: palette["mint-500"],
  /** color/text-primary → navy-900 */
  textPrimary: palette["navy-900"],
  /** color/text-inverse → white */
  textInverse: palette.white,
  /** color/body → slate-600 (본문 텍스트) */
  body: palette["slate-600"],
  /** color/muted → slate-400 (보조 텍스트) */
  muted: palette["slate-400"],
  /** color/canvas → white (페이지 배경) */
  canvas: palette.white,
  /** color/surface → gray-100 */
  surface: palette["gray-100"],
  /** color/surface-soft → surface-soft */
  surfaceSoft: palette["surface-soft"],
  /** color/surface-elevated → white */
  surfaceElevated: palette.white,
  /** color/on-primary → white (primary 배경 위 텍스트) */
  onPrimary: palette.white,
  /** color/icon-default → navy-900 */
  iconDefault: palette["navy-900"],
  /** color/border → gray-200 */
  border: palette["gray-200"],
  /** color/hairline-strong → slate-300 */
  hairlineStrong: palette["slate-300"],
  /** color/warning → amber-500 */
  warning: palette["amber-500"],
  /** color/error → red-500 */
  error: palette["red-500"],
} as const;
