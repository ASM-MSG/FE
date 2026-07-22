import type { Meta, StoryObj } from "@storybook/react-vite";
import { Chip } from "./chip";

const meta = {
  title: "Components/Chip",
  component: Chip,
  args: { text: "부산진구", active: false, disabled: false },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-md bg-surface p-md">
      <Chip text="부산진구" />
      <Chip text="부산진구" active />
      <Chip text="부산진구" disabled />
    </div>
  ),
};
