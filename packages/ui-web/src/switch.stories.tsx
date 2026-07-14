import type { Meta, StoryObj } from "@storybook/react-vite";
import { Switch } from "./switch";

const meta = {
  title: "Components/Switch",
  component: Switch,
  args: { disabled: false },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** off/on × default/disabled — Figma variant와 1:1 */
export const AllVariants: Story = {
  render: () => (
    <div className="grid w-[100px] grid-cols-2 gap-md">
      <Switch />
      <Switch defaultChecked />
      <Switch disabled />
      <Switch defaultChecked disabled />
    </div>
  ),
};
