import { View } from "react-native";
import { EllipsisVertical } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import type { Meta, StoryObj } from "@storybook/react-native";
import { AppHeader } from "./app-header";

const meta = {
  title: "Components/AppHeader",
  component: AppHeader,
  args: {
    title: "격자 상세 보기",
  },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 타이틀만/뒤로가기/우측 액션 구성 */
export const AllLayouts: Story = {
  render: () => (
    <View className="gap-md">
      <AppHeader title="개인 도감" />
      <AppHeader title="프로필 편집" onBack={() => {}} />
      <AppHeader
        title="서면역 2번 출구"
        onBack={() => {}}
        right={<EllipsisVertical size={16} color={semantic.iconDefault} />}
      />
    </View>
  ),
};
