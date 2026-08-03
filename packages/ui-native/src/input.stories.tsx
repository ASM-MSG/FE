import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Input } from "./input";

const meta = {
  title: "Components/Input",
  component: Input,
  args: {
    placeholder: "내용을 입력하세요",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 기본/에러/비활성 상태 */
export const AllStates: Story = {
  render: () => (
    <View className="gap-md">
      <Input placeholder="닉네임을 입력하세요" />
      <Input error defaultValue="서면!거리@야경" />
      <Input disabled defaultValue="수정 불가 값" />
    </View>
  ),
};
