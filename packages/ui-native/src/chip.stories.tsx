import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Chip } from "./chip";

const meta = {
  title: "Components/Chip",
  component: Chip,
  args: {
    text: "부산진구",
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 기본/활성/비활성 — 지도 홈 카테고리 칩 구성 */
export const AllStates: Story = {
  render: () => (
    <View className="flex-row flex-wrap items-center gap-xs">
      <Chip text="전포 카페거리" />
      <Chip text="서면 1번가" active />
      <Chip text="부전시장" disabled />
    </View>
  ),
};
