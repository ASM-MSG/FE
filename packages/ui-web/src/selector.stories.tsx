import type { Meta, StoryObj } from "@storybook/react-vite";
import { Selector } from "./selector";

const meta = {
  title: "Components/Selector",
  component: Selector,
  args: { type: "checkbox", disabled: false },
  argTypes: {
    type: { control: "select", options: ["checkbox", "radio"] },
  },
} satisfies Meta<typeof Selector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** checkbox/radio × off/on — Figma variant와 1:1 */
export const AllVariants: Story = {
  render: () => (
    <div className="grid w-[60px] grid-cols-2 gap-md">
      <Selector />
      <Selector defaultChecked />
      <Selector type="radio" />
      <Selector type="radio" defaultChecked />
    </div>
  ),
};
