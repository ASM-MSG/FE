/**
 * 웹(ui-web)/앱(ui-native)이 공유하는 컴포넌트 props API 계약.
 * variant 값은 Figma 컴포넌트의 variant 속성과 1:1로 유지한다.
 * 새 공통 컴포넌트를 만들 때마다 여기에 XxxBaseProps를 추가한다.
 *
 * SOURCE: Figma "🧩 FeelMap 공통 컴포넌트 (앱·웹)" 섹션 (node 13407:687)
 * State=pressed/focus 계열 variant는 플랫폼 인터랙션(active/focus)으로 처리하므로
 * props에 포함하지 않는다.
 */

/** SOURCE: Figma "FeelMap Button" (node 13427:723) — Type 속성 */
export type ButtonVariant = "primary" | "secondary" | "danger";
/** SOURCE: Figma "FeelMap Button" — Size 속성 */
export type ButtonSize = "lg" | "sm";

export interface ButtonBaseProps {
  /** 기본 "primary" */
  variant?: ButtonVariant;
  /** 기본 "lg" */
  size?: ButtonSize;
  disabled?: boolean;
}

/** SOURCE: Figma "FeelMap Chip" (node 13428:693) — State=active를 boolean으로 */
export interface ChipBaseProps {
  active?: boolean;
  disabled?: boolean;
}

/** SOURCE: Figma "FeelMap Input" (node 13429:695) — State=error를 boolean으로 (focus/filled는 인터랙션) */
export interface InputBaseProps {
  error?: boolean;
  disabled?: boolean;
}

/** SOURCE: Figma "FeelMap Switch" (node 13430:695) — On 속성 */
export interface SwitchBaseProps {
  checked?: boolean;
  disabled?: boolean;
}

/** SOURCE: Figma "FeelMap Selector" (node 13430:703) — Type 속성 */
export type SelectorType = "checkbox" | "radio";

export interface SelectorBaseProps {
  /** 기본 "checkbox" */
  type?: SelectorType;
  checked?: boolean;
  disabled?: boolean;
}

/** SOURCE: Figma "FeelMap Avatar" (node 13430:714) — Size 속성 (48/36/28px) */
export type AvatarSize = "lg" | "md" | "sm";

export interface AvatarBaseProps {
  /** 기본 "lg" */
  size?: AvatarSize;
}

/** SOURCE: Figma "FeelMap Toast" (node 13405:708) — Style 속성 */
export type ToastVariant = "dark" | "light";

export interface ToastBaseProps {
  /** 기본 "dark" */
  variant?: ToastVariant;
}

/** SOURCE: Figma "FeelMap GridCell" (node 13405:690) — State 속성 */
export type GridCellState = "default" | "collected" | "selected";

export interface GridCellBaseProps {
  /** 기본 "default" */
  state?: GridCellState;
}

/** SOURCE: Figma "FeelMap Skeleton" (node 14798:5267) — Type 속성 */
export type SkeletonVariant = "text-line" | "pill";

export interface SkeletonBaseProps {
  /** 기본 "text-line" */
  variant?: SkeletonVariant;
}

/** SOURCE: Figma "FeelMap MapIconButton" (node 13404:693) — Icon 속성 */
export type MapIconButtonIcon = "back" | "locate";

export interface MapIconButtonBaseProps {
  /** 기본 "back" */
  icon?: MapIconButtonIcon;
  disabled?: boolean;
}
