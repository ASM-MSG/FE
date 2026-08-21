import { Text, View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { SegmentedProgress } from "./segmented-progress";

const meta = {
  title: "Components/SegmentedProgress",
  component: SegmentedProgress,
  args: {
    total: 3,
    current: 1,
  },
} satisfies Meta<typeof SegmentedProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** total·current 조합 — 채움 개수가 current와 일치한다 (기준 5) */
export const Steps: Story = {
  render: () => (
    <View className="gap-md">
      {[
        { total: 3, current: 0 },
        { total: 3, current: 2 },
        { total: 3, current: 3 },
        { total: 5, current: 2 },
      ].map(({ total, current }) => (
        <View key={`${total}-${current}`} className="gap-xxs">
          <Text className="text-fm-caption text-foreground-muted">
            {current} / {total}
          </Text>
          <SegmentedProgress total={total} current={current} />
        </View>
      ))}
    </View>
  ),
};
