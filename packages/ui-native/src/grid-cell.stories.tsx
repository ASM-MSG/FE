import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { GridCell } from "./grid-cell";

const meta = {
  title: "Components/GridCell",
  component: GridCell,
  args: {
    className: "size-20",
  },
} satisfies Meta<typeof GridCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** default/collected/selected — 지도 격자 상태 3종 */
export const AllStates: Story = {
  render: () => (
    <View className="flex-row items-center gap-md">
      <GridCell className="size-20" />
      <GridCell state="collected" className="size-20" />
      <GridCell state="selected" className="size-20" />
    </View>
  ),
};
