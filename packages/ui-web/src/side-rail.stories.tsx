import type { Meta, StoryObj } from "@storybook/react-vite";
import { Compass, Home, LayoutGrid, MapPin, Upload, User } from "lucide-react";
import { SideRail } from "./side-rail";

const items = [
  { key: "home", label: "홈", icon: <Home className="size-[22px]" /> },
  { key: "explore", label: "탐색", icon: <Compass className="size-[22px]" /> },
  { key: "upload", label: "업로드", icon: <Upload className="size-[22px]" /> },
  { key: "dex", label: "도감", icon: <LayoutGrid className="size-[22px]" /> },
  { key: "profile", label: "프로필", icon: <User className="size-[22px]" /> },
];

const meta = {
  title: "Components/SideRail",
  component: SideRail,
  args: {
    items,
    activeKey: "home",
    logo: (
      <span className="flex size-full items-center justify-center bg-primary text-primary-foreground">
        <MapPin className="size-[20px]" />
      </span>
    ),
  },
  argTypes: {
    activeKey: { control: "select", options: items.map((i) => i.key) },
  },
} satisfies Meta<typeof SideRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="flex h-[600px] bg-surface">
      <SideRail {...args} />
    </div>
  ),
};
