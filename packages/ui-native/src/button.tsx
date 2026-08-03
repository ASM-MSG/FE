import { Pressable, Text } from "react-native";
import type {
  ButtonBaseProps,
  ButtonSize,
  ButtonVariant,
} from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

/**
 * SOURCE: Figma "FeelMap Button" (node 13427:723) — ui-web button.tsx과 동일 API.
 * 웹 CVA variant를 RN 클래스맵으로 치환 (DESIGN_SYSTEM_SPEC 5번 패턴).
 * State=pressed는 웹 active:brightness(CSS filter — RN 미지원) 대신
 * RN 표준 프레스 피드백(active:opacity)으로 재현한다.
 */
const containerVariant: Record<ButtonVariant, string> = {
  primary: "bg-primary",
  secondary: "bg-background",
  danger: "bg-error",
};

const containerSize: Record<ButtonSize, string> = {
  lg: "h-12 min-w-35 rounded-md px-lg",
  sm: "h-9 min-w-26 rounded-sm px-md",
};

const textVariant: Record<ButtonVariant, string> = {
  primary: "text-primary-foreground",
  secondary: "text-foreground",
  danger: "text-primary-foreground",
};

const textSize: Record<ButtonSize, string> = {
  lg: "text-fm-title",
  sm: "text-fm-body-strong",
};

interface ButtonProps extends ButtonBaseProps {
  text: string;
  onPress?: () => void;
  className?: string;
}

/**
 * 공용 Button. variant/size는 Figma Button 컴포넌트의 Variant 속성과 1:1.
 *
 * @example
 * <Button text="저장" variant="primary" onPress={onSave} />
 * <Button text="삭제" variant="danger" size="sm" />
 */
export const Button = ({
  text,
  variant = "primary",
  size = "lg",
  disabled,
  onPress,
  className,
}: ButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: !!disabled }}
    disabled={disabled}
    onPress={onPress}
    className={cx(
      "items-center justify-center",
      containerSize[size],
      disabled
        ? "bg-background"
        : cx(containerVariant[variant], "active:opacity-80"),
      className,
    )}
  >
    <Text
      className={cx(
        textSize[size],
        disabled ? "text-foreground-muted" : textVariant[variant],
      )}
    >
      {text}
    </Text>
  </Pressable>
);
