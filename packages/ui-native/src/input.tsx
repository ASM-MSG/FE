import { TextInput } from "react-native";
import type { TextInputProps } from "react-native";
import { semantic } from "@fillmap/design-tokens";
import type { InputBaseProps } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

interface InputProps
  extends InputBaseProps,
    Omit<TextInputProps, "editable"> {}

/**
 * SOURCE: Figma "FeelMap Input" (node 13429:695) — 텍스트 입력.
 * State=focus는 focus: 인터랙션, State=filled는 값 유무로 자연 처리, State=error만 prop.
 * disabled는 RN TextInput의 editable=false로 매핑한다.
 *
 * @example
 * <Input placeholder="내용을 입력하세요" />
 * <Input error value={value} onChangeText={onChange} />
 */
export const Input = ({ error, disabled, className, ...props }: InputProps) => (
  <TextInput
    accessibilityState={{ disabled: !!disabled }}
    editable={!disabled}
    placeholderTextColor={semantic.muted}
    className={cx(
      "h-12 w-full rounded-md border-[1.5px] border-transparent bg-background px-md text-fm-base text-foreground focus:border-primary",
      error && "border-error focus:border-error",
      disabled && "opacity-50",
      className,
    )}
    {...props}
  />
);
