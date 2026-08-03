import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Dots } from "./dots";

const meta = {
  title: "Components/Dots",
  component: Dots,
} satisfies Meta<typeof Dots>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 온보딩 1–3 페이지 진행 표시 */
export const AllPositions: Story = {
  render: () => (
    <View className="gap-xs">
      <Dots activeIndex={0} />
      <Dots activeIndex={1} />
      <Dots activeIndex={2} />
    </View>
  ),
};
