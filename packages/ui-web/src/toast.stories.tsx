import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toast } from "./toast";

const meta = {
  title: "Components/Toast",
  component: Toast,
  args: {
    variant: "dark",
    title: "업로드 전 최종 확인",
    description: "AI 처리가 끝나면 미리보기에서 확인한 뒤 지도에 게시돼요",
  },
  argTypes: {
    variant: { control: "select", options: ["dark", "light"] },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[342px]">
      <Toast {...args} />
    </div>
  ),
};

/** 다크/라이트 — Figma Style과 1:1 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex w-[342px] flex-col gap-md bg-surface p-md">
      <Toast
        title="업로드 전 최종 확인"
        description="AI 처리가 끝나면 미리보기에서 확인한 뒤 지도에 게시돼요"
      />
      <Toast
        variant="light"
        title="AI 하이라이트 자동 추천"
        description="5초를 초과하는 영상은 AI가 최적 구간을 자동 분석해 3~5개 구간을 추천해요"
      />
    </div>
  ),
};
