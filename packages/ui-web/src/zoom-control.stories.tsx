import type { Meta, StoryObj } from "@storybook/react-vite";
import { ZoomControl } from "./zoom-control";

const meta = {
  title: "Components/ZoomControl",
  component: ZoomControl,
} satisfies Meta<typeof ZoomControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="bg-surface p-md">
      <ZoomControl {...args} />
    </div>
  ),
};
