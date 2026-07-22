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
    <div className="w-97.5 bg-surface pt-xl">
      <BottomSheet {...args}>
        <VideoRow title="서면 거리 야경 감성" meta="조회 214 · 어제" />
        <VideoRow title="전포 카페거리 브이로그" meta="조회 87 · 2일 전" />
      </BottomSheet>
    </div>
  ),
};

/** 웹 도킹 패널 — 핸들 없이 지도 위에 뜨는 형태 (지도 홈 요약 패널) */
export const Docked: Story = {
  args: { handle: false },
  render: (args) => (
    <div className="w-97.5 bg-surface p-md">
      <BottomSheet {...args} className="rounded-lg">
        <VideoRow title="서면 거리 야경 감성" meta="조회 214 · 어제" />
      </BottomSheet>
    </div>
  ),
};
