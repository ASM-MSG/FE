import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Avatar } from "./avatar";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: {
    fallback: "김",
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Size lg/md/sm (48/36/28px) — 폴백 텍스트 표시 */
export const AllSizes: Story = {
  render: () => (
    <View className="flex-row items-center gap-md">
      <Avatar size="lg" fallback="김" />
      <Avatar size="md" fallback="김" />
      <Avatar size="sm" fallback="김" />
    </View>
  ),
};
