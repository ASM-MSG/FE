import { useState } from "react";
import { Pressable } from "react-native";
import { Check } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import type { SelectorBaseProps, SelectorType } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

/**
 * SOURCE: Figma "FeelMap Selector" (node 13430:703) — 체크박스/라디오 (20×20).
 * 두 타입 모두 단일 on/off 토글로 구현한다 —
 * 라디오의 그룹 배타 선택은 사용하는 쪽에서 조합한다 (ui-web과 동일 계약).
 */
const typeShape: Record<SelectorType, string> = {
  checkbox: "rounded-xs",
  radio: "rounded-full",
};

const typeChecked: Record<SelectorType, string> = {
  checkbox: "border-transparent bg-primary",
  radio: "border-[6px] border-primary bg-background",
};

interface SelectorProps extends SelectorBaseProps {
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

/**
 * @example
 * <Selector checked={agreed} onCheckedChange={setAgreed} />
 * <Selector type="radio" checked={value === "a"} onCheckedChange={() => setValue("a")} />
 */
export const Selector = ({
  type = "checkbox",
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  className,
}: SelectorProps) => {
  const [internal, setInternal] = useState(defaultChecked ?? false);
  const isChecked = checked ?? internal;

  const toggle = () => {
    if (checked === undefined) setInternal(!isChecked);
    onCheckedChange?.(!isChecked);
  };

  return (
    <Pressable
      accessibilityRole={type === "checkbox" ? "checkbox" : "radio"}
      accessibilityState={{ checked: isChecked, disabled: !!disabled }}
      disabled={disabled}
      onPress={toggle}
      className={cx(
        "size-5 items-center justify-center border-[1.5px] border-border bg-surface",
        typeShape[type],
        isChecked && typeChecked[type],
        disabled && "opacity-50",
        className,
      )}
    >
      {type === "checkbox" && isChecked && (
        <Check size={14} strokeWidth={3} color={semantic.onPrimary} />
      )}
    </Pressable>
  );
};
