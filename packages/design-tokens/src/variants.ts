/**
 * 웹(ui-web)/앱(ui-native)이 공유하는 컴포넌트 props API 계약.
 * variant 값은 Figma 컴포넌트의 variant 속성과 1:1로 유지한다.
 * 새 공통 컴포넌트를 만들 때마다 여기에 XxxBaseProps를 추가한다.
 */

/** SOURCE: Figma Button 컴포넌트 셋 (node 13021:535)의 Variant 속성 */
export type ButtonVariant =
  | "default"
  | "default-active"
  | "primary"
  | "secondary"
  | "danger"
  | "chip"
  | "chip-active";

export interface ButtonBaseProps {
  /** 기본 "default" (Figma 기본 variant) */
  variant?: ButtonVariant;
  disabled?: boolean;
}
