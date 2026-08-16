import type { Meta, StoryObj } from "@storybook/react-vite";
import { DotsLoader } from "./dots-loader";

const meta = {
  title: "Components/DotsLoader",
  component: DotsLoader,
} satisfies Meta<typeof DotsLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** 좌측 패널 사용 형태 — 중앙 정렬은 호출부가 감싼다 */
export const InPanel: Story = {
  render: () => (
    <div className="flex h-60 w-97 items-center justify-center bg-background shadow-raised">
      <DotsLoader label="패널 불러오는 중" />
    </div>
  ),
};
