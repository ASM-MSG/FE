import type { Meta, StoryObj } from "@storybook/react-vite";
import { RetryNotice } from "./retry-notice";

const meta = {
  title: "Components/RetryNotice",
  component: RetryNotice,
  args: {
    message: "지역 목록을 불러오지 못했어요",
    onRetry: () => undefined,
  },
} satisfies Meta<typeof RetryNotice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** 388px 좌측 패널 안 사용 형태 */
export const InPanel: Story = {
  render: (args) => (
    <div className="w-97 bg-background p-md shadow-raised">
      <RetryNotice {...args} />
    </div>
  ),
};
