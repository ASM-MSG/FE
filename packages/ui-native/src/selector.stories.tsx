import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Selector } from "./selector";

const meta = {
  title: "Components/Selector",
  component: Selector,
} satisfies Meta<typeof Selector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 탭하면 토글되는 uncontrolled 데모 */
export const Default: Story = {};

/** checkbox/radio × off/on/비활성 매트릭스 */
export const AllStates: Story = {
  render: () => (
    <View className="gap-md">
      <View className="flex-row items-center gap-md">
        <Selector />
        <Selector defaultChecked />
        <Selector disabled />
      </View>
      <View className="flex-row items-center gap-md">
        <Selector type="radio" />
        <Selector type="radio" defaultChecked />
        <Selector type="radio" disabled />
      </View>
    </View>
  ),
};
