import type { Meta, StoryObj } from "@storybook/react-vite";
import { VideoRow } from "./video-row";

const meta = {
  title: "Components/VideoRow",
  component: VideoRow,
  args: { title: "홍대 거리 야경 감성", meta: "조회 214 · 어제" },
} satisfies Meta<typeof VideoRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-90">
      <VideoRow {...args} />
    </div>
  ),
};

export const List: Story = {
  render: () => (
    <div className="flex w-90 flex-col gap-sm">
      <VideoRow title="홍대 거리 야경 감성" meta="조회 214 · 어제" />
      <VideoRow title="성수동 카페거리 브이로그" meta="조회 87 · 2일 전" />
      <VideoRow
        title="아주 아주 아주 아주 아주 아주 아주 긴 영상 제목의 말줄임 확인"
        meta="조회 1,024 · 일주일 전"
      />
    </div>
  ),
};
