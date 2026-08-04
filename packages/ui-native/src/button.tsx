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
  lg: "h-12 min-w-35 px-lg",
  sm: "h-9 min-w-26 px-md",
};

/**
 * 모서리는 shape 옵션이 단독 결정 — className 오버라이드로 rounded-*를 겹치면
 * cx가 단순 join이라 승자가 비보장이므로, 충돌 자체가 없도록 내부에서 분기한다.
 * (Dots activeShape와 동일한 API 관례 — MSG-292)
 */
const containerRounded: Record<ButtonShape, Record<ButtonSize, string>> = {
  rounded: { lg: "rounded-md", sm: "rounded-sm" },
  pill: { lg: "rounded-full", sm: "rounded-full" },
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

type ButtonShape = "rounded" | "pill";

interface ButtonProps extends ButtonBaseProps {
  text: string;
  onPress?: () => void;
  /** 모서리 모양. 기본 "rounded"(기존 렌더 불변) — 사이즈별 rounded-md/sm, "pill"은 rounded-full (온보딩 CTA 14133:544) */
  shape?: ButtonShape;
  className?: string;
}

/**
 * 공용 Button. variant/size는 Figma Button 컴포넌트의 Variant 속성과 1:1.
 *
 * @example
 * <Button text="저장" variant="primary" onPress={onSave} />
 * <Button text="삭제" variant="danger" size="sm" />
 * <Button text="시작하기" shape="pill" className="w-full" />
 */
export const Button = ({
  text,
  variant = "primary",
  size = "lg",
  shape = "rounded",
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
      containerRounded[shape][size],
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
