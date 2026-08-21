import type { Meta, StoryObj } from "@storybook/react-native";
import { BottomSheet } from "./bottom-sheet";
import { VideoRow } from "./video-row";

const meta = {
  title: "Components/BottomSheet",
  component: BottomSheet,
  args: {
    title: "이 지역 격자 24개 · 영상 138개",
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 타이틀 + 전체 보기 액션 + 영상 목록 콘텐츠 */
export const WithContent: Story = {
  render: () => (
    <BottomSheet
      title="이 지역 격자 24개 · 영상 138개"
      actionLabel="전체 보기"
      onAction={() => {}}
    >
      <VideoRow title="서면 거리 야경 감성" meta="조회 214 · 어제" />
      <VideoRow title="전포 카페거리 브이로그" meta="조회 98 · 2일 전" />
    </BottomSheet>
  ),
};

/** 핸들 없는 구성 */
export const WithoutHandle: Story = {
  args: {
    handle: false,
    title: "부전시장 먹거리 골목",
  },
};
