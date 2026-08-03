import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { VideoRow } from "./video-row";

const meta = {
  title: "Components/VideoRow",
  component: VideoRow,
  args: {
    title: "서면 거리 야경 감성",
    meta: "조회 214 · 어제",
  },
} satisfies Meta<typeof VideoRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 썸네일 플레이스홀더/메타 유무 구성 */
export const AllLayouts: Story = {
  render: () => (
    <View className="gap-sm">
      <VideoRow title="서면 거리 야경 감성" meta="조회 214 · 어제" />
      <VideoRow title="전포 카페거리 브이로그" meta="조회 98 · 2일 전" />
      <VideoRow title="놀이마루 스케이트 연습" />
    </View>
  ),
};
