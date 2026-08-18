import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { CellBadge } from "./cell-badge";

const meta = {
  title: "Components/CellBadge",
  component: CellBadge,
  args: {
    label: "A-14",
  },
} satisfies Meta<typeof CellBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 격자 코드 여러 개 — 지도·격자 상세에서 쓰는 라벨 형태 */
export const Codes: Story = {
  render: () => (
    <View className="flex-row flex-wrap items-center gap-xs">
      <CellBadge label="A-14" />
      <CellBadge label="B-3" />
      <CellBadge label="C-27" />
    </View>
  ),
};
