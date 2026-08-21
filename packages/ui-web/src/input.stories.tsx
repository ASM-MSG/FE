import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";

const meta = {
  title: "Components/Input",
  component: Input,
  args: { placeholder: "내용을 입력하세요", error: false, disabled: false },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** default / focus(클릭해서 확인) / filled / error — Figma State와 1:1 */
export const AllStates: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-md bg-surface p-md">
      <Input placeholder="내용을 입력하세요" />
      <Input defaultValue="부산진구 부전동" />
      <Input defaultValue="부산진구 부전동" error />
      <Input placeholder="내용을 입력하세요" disabled />
    </div>
  ),
};
