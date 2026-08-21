import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Fab } from "./fab";

const meta = {
  title: "Components/Fab",
  component: Fab,
  args: {
    accessibilityLabel: "기록하기",
  },
} satisfies Meta<typeof Fab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 기본/비활성 */
export const AllStates: Story = {
  render: () => (
    <View className="flex-row items-center gap-md">
      <Fab accessibilityLabel="기록하기" />
      <Fab accessibilityLabel="기록하기" disabled />
    </View>
  ),
};
