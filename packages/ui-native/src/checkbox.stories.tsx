import { useState } from "react";
import { Text, View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Checkbox, type CheckboxVariant } from "./checkbox";

/** 탭으로 checked가 바뀌는 것을 확인하는 데모 (기준 4) */
const CheckboxDemo = ({
  variant,
  label,
  accessibilityLabel,
}: {
  variant: CheckboxVariant;
  /** 시각 라벨 — 접근 가능한 이름을 겸하므로 데모에서도 필수다 (Checkbox 이름 계약) */
  label: string;
  accessibilityLabel?: string;
}) => {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      variant={variant}
      checked={checked}
      onChange={setChecked}
      label={label}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  args: {
    checked: false,
    label: "전체 동의",
    onChange: () => {},
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <CheckboxDemo variant="circle" label="전체 동의" />,
};

/** 원형(circle) — 미동의/동의/비활성 */
export const Circle: Story = {
  render: () => (
    <View className="gap-sm">
      <Checkbox checked={false} onChange={() => {}} label="전체 동의" />
      <Checkbox checked onChange={() => {}} label="전체 동의" />
      <Checkbox checked disabled onChange={() => {}} label="전체 동의" />
    </View>
  ),
};

/**
 * 글리프(glyph) — 약관 행 구성(체크 마크 단독 + 화면이 조립한 라벨).
 * 라벨 Text가 컨트롤 밖에 있으므로 접근 가능한 이름은 `accessibilityLabel`로 전달한다.
 */
export const Glyph: Story = {
  render: () => (
    <View className="gap-sm">
      <View className="flex-row items-center gap-xs">
        <Checkbox
          variant="glyph"
          checked
          onChange={() => {}}
          accessibilityLabel="서비스 이용약관 동의 (필수)"
        />
        <Text className="text-fm-body text-foreground">
          서비스 이용약관 동의 (필수)
        </Text>
      </View>
      <View className="flex-row items-center gap-xs">
        <Checkbox
          variant="glyph"
          checked={false}
          onChange={() => {}}
          accessibilityLabel="마케팅 정보 수신 동의 (선택)"
        />
        <Text className="text-fm-body text-foreground-body">
          마케팅 정보 수신 동의 (선택)
        </Text>
      </View>
      <CheckboxDemo
        variant="glyph"
        label="탭해서 토글"
        accessibilityLabel="탭해서 토글"
      />
    </View>
  ),
};
