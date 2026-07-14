import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dots } from "./dots";

const meta = {
  title: "Components/Dots",
  component: Dots,
  args: { count: 3, activeIndex: 0 },
} satisfies Meta<typeof Dots>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
