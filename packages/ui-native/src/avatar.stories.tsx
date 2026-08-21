import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { User } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Avatar } from "./avatar";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: {
    fallback: "김",
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Size lg/md/sm (48/36/28px) — 폴백 텍스트 표시 */
export const AllSizes: Story = {
  render: () => (
    <View className="flex-row items-center gap-md">
      <Avatar size="lg" fallback="김" />
      <Avatar size="md" fallback="김" />
      <Avatar size="sm" fallback="김" />
    </View>
  ),
};

/**
 * fallbackIcon — 이니셜 텍스트 대신 아이콘으로 폴백 (프로필 기본 이미지, MSG-426).
 * 지정하지 않으면 위 스토리들처럼 종전대로 텍스트가 렌더된다.
 */
export const IconFallback: Story = {
  render: () => (
    <View className="flex-row items-center gap-md">
      <Avatar
        size="lg"
        className="size-14"
        fallbackIcon={<User size={28} color={semantic.muted} />}
      />
      <Avatar
        size="md"
        fallbackIcon={<User size={20} color={semantic.muted} />}
      />
    </View>
  ),
};
