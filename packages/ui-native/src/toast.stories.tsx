import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Toast } from "./toast";

const meta = {
  title: "Components/Toast",
  component: Toast,
  args: {
    title: "업로드 전 최종 확인",
    description: "AI 처리가 끝나면 알려드릴게요",
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** dark/light 스타일 비교 */
export const AllVariants: Story = {
  render: () => (
    <View className="gap-md">
      <Toast
        title="업로드 전 최종 확인"
        description="AI 처리가 끝나면 알려드릴게요"
      />
      <Toast
        variant="light"
        title="AI 하이라이트 자동 추천"
        description="서면 격자 영상에서 추천 구간을 골랐어요"
      />
    </View>
  ),
};
