import { useState } from "react";
import { Pressable, View } from "react-native";
import type { SwitchBaseProps } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

interface SwitchProps extends SwitchBaseProps {
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** 스크린리더용 이름 — 시각 라벨이 별도 Text로 떨어져 있을 때 필수 */
  accessibilityLabel?: string;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap Switch" (node 13430:695) — 토글 (36×20).
 * 웹은 Radix Switch, RN은 Pressable 트랙 + 썸으로 동일 시각을 재현한다.
 * checked 미지정 시 내부 상태로 동작(uncontrolled) — 웹 defaultChecked와 동일 계약.
 *
 * @example
 * <Switch checked={enabled} onCheckedChange={setEnabled} />
 */
export const Switch = ({
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  accessibilityLabel,
  className,
}: SwitchProps) => {
  const [internal, setInternal] = useState(defaultChecked ?? false);
  const isOn = checked ?? internal;

  const toggle = () => {
    if (checked === undefined) setInternal(!isOn);
    onCheckedChange?.(!isOn);
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: isOn, disabled: !!disabled }}
      disabled={disabled}
      onPress={toggle}
      className={cx(
        "h-5 w-9 justify-center rounded-full p-0.5",
        isOn ? "bg-primary" : "bg-border",
        disabled && "opacity-50",
        className,
      )}
    >
      <View
        className={cx(
          "size-4 rounded-full bg-background shadow-raised",
          isOn && "translate-x-4",
        )}
      />
    </Pressable>
  );
};
