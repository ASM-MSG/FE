import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fab } from "./fab";

const meta = {
  title: "Components/Fab",
  component: Fab,
  args: { "aria-label": "기록하기" },
} satisfies Meta<typeof Fab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
