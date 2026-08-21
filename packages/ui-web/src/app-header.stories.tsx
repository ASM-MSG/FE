import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppHeader } from "./app-header";

const meta = {
  title: "Components/AppHeader",
  component: AppHeader,
  args: { title: "화면 타이틀", onBack: () => {} },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-97.5 bg-surface pb-lg">
      <AppHeader {...args} />
    </div>
  ),
};
