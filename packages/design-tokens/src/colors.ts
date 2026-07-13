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
