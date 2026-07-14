import type { Meta, StoryObj } from "@storybook/react-vite";
import { GridCell } from "./grid-cell";

const meta = {
  title: "Components/GridCell",
  component: GridCell,
  args: { state: "default", className: "size-[130px]" },
  argTypes: {
    state: { control: "select", options: ["default", "collected", "selected"] },
  },
} satisfies Meta<typeof GridCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** 기본/수집/선택 — Figma State와 1:1 */
export const AllStates: Story = {
  render: () => (
    <div className="flex gap-md bg-surface-soft p-md">
      <GridCell className="size-[130px]" />
      <GridCell state="collected" className="size-[130px]" />
      <GridCell state="selected" className="size-[130px]" />
    </div>
  ),
};
