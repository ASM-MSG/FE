import type { Meta, StoryObj } from "@storybook/react-vite";
import { CellBadge } from "./cell-badge";

const meta = {
  title: "Components/CellBadge",
  component: CellBadge,
  args: { label: "A-14" },
} satisfies Meta<typeof CellBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
