import type { Meta, StoryObj } from "@storybook/react-vite";
import { BottomSheet } from "./bottom-sheet";
import { VideoRow } from "./video-row";

const meta = {
  title: "Components/BottomSheet",
  component: BottomSheet,
  args: {
    title: "이 지역 격자 24개 · 영상 138개",
    actionLabel: "전체 보기",
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[390px] bg-surface pt-xl">
      <BottomSheet {...args}>
        <VideoRow title="홍대 거리 야경 감성" meta="조회 214 · 어제" />
        <VideoRow title="성수동 카페거리 브이로그" meta="조회 87 · 2일 전" />
      </BottomSheet>
    </div>
  ),
};
