import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip } from "./chip";

const meta = {
  title: "Components/Chip",
  component: Chip,
  args: { text: "동작구", active: false, disabled: false },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-md bg-surface p-md">
      <Chip text="동작구" />
      <Chip text="동작구" active />
      <Chip text="동작구" disabled />
    </div>
  ),
};
