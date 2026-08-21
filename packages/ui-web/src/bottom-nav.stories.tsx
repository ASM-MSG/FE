import type { Meta, StoryObj } from "@storybook/react-vite";
import { Compass, Home, LayoutGrid, User } from "lucide-react";
import { BottomNav } from "./bottom-nav";

const items = [
  { key: "home", label: "홈", icon: <Home className="size-5.5" /> },
  { key: "explore", label: "탐색", icon: <Compass className="size-5.5" /> },
  { key: "dex", label: "도감", icon: <LayoutGrid className="size-5.5" /> },
  { key: "profile", label: "프로필", icon: <User className="size-5.5" /> },
];

const meta = {
  title: "Components/BottomNav",
  component: BottomNav,
  args: { items, activeKey: "home" },
  argTypes: {
    activeKey: { control: "select", options: items.map((i) => i.key) },
  },
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-97.5 bg-surface pt-lg">
      <BottomNav {...args} />
    </div>
  ),
};
