import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { MapIconButton } from "./map-icon-button";

const meta = {
  title: "Components/MapIconButton",
  component: MapIconButton,
} satisfies Meta<typeof MapIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** back(배경 없음)/locate(흰 원형 + 그림자)/locate 활성(아이콘 primary — MSG-565) */
export const AllIcons: Story = {
  render: () => (
    <View className="flex-row items-center gap-md">
      <MapIconButton />
      <MapIconButton icon="locate" />
      <MapIconButton icon="locate" active />
      <MapIconButton icon="locate" disabled />
    </View>
  ),
};
