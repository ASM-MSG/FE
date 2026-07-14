import type { Meta, StoryObj } from "@storybook/react-vite";
import { MapIconButton } from "./map-icon-button";

const meta = {
  title: "Components/MapIconButton",
  component: MapIconButton,
  args: { icon: "back", disabled: false },
  argTypes: {
    icon: { control: "select", options: ["back", "locate"] },
  },
} satisfies Meta<typeof MapIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** back/locate — Figma Icon과 1:1 (pressed는 클릭으로 확인) */
export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-md bg-surface p-md">
      <MapIconButton icon="back" />
      <MapIconButton icon="locate" />
    </div>
  ),
};
