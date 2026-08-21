import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "./avatar";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: { size: "lg", fallback: "김" },
  argTypes: {
    size: { control: "select", options: ["lg", "md", "sm"] },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** 48/36/28 — Figma Size와 1:1 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-md">
      <Avatar size="lg" fallback="김" />
      <Avatar size="md" fallback="김" />
      <Avatar size="sm" fallback="김" />
    </div>
  ),
};
