import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { StatTile } from "./stat-tile";

const meta = {
  title: "Components/StatTile",
  component: StatTile,
  args: {
    value: "12",
    label: "수집 영상",
  },
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 3-타일 row — 균등 폭으로 늘어난다 (기준 6, 격자 상세 stats 구성) */
export const ThreeUp: Story = {
  render: () => (
    <View className="w-full flex-row rounded-md bg-surface py-sm">
      <StatTile value="24" label="영상" />
      <StatTile value="8" label="수집한 사람" />
      <StatTile value="1.2천" label="조회" />
    </View>
  ),
};
