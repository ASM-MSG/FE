import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Switch } from "./switch";

const meta = {
  title: "Components/Switch",
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 탭하면 토글되는 uncontrolled 데모 */
export const Default: Story = {};

/** off/on/비활성 상태 */
export const AllStates: Story = {
  render: () => (
    <View className="flex-row items-center gap-md">
      <Switch />
      <Switch defaultChecked />
      <Switch disabled />
      <Switch defaultChecked disabled />
    </View>
  ),
};
