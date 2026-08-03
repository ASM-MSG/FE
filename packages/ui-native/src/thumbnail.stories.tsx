import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Thumbnail } from "./thumbnail";

const meta = {
  title: "Components/Thumbnail",
  component: Thumbnail,
  args: {
    fallback: "서면",
  },
} satisfies Meta<typeof Thumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Shape square/round (64px) — 폴백 텍스트 표시 */
export const AllShapes: Story = {
  render: () => (
    <View className="flex-row items-center gap-md">
      <Thumbnail fallback="서면" />
      <Thumbnail shape="round" fallback="전포" />
    </View>
  ),
};
