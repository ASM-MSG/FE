import { Text, View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { ProgressBar } from "./progress-bar";

const meta = {
  title: "Components/ProgressBar",
  component: ProgressBar,
  args: {
    value: 0.42,
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 0 · 중간 · 1 — 채움 폭이 값과 일치한다 (기준 14) */
export const Values: Story = {
  render: () => (
    <View className="gap-md">
      {[0, 0.5, 1].map((value) => (
        <View key={value} className="gap-xxs">
          <Text className="text-fm-caption text-foreground-muted">
            {Math.round(value * 100)}%
          </Text>
          <ProgressBar value={value} />
        </View>
      ))}
    </View>
  ),
};

/** 범위 밖 값은 0~1로 클램프된다 — 두 바가 각각 빈 바·꽉 찬 바로 보인다 (기준 14) */
export const Clamped: Story = {
  render: () => (
    <View className="gap-md">
      <ProgressBar value={-0.5} />
      <ProgressBar value={1.8} />
    </View>
  ),
};
