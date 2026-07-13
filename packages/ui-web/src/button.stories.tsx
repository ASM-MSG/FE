import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

/** Figma Button 컴포넌트 셋 (node 13021:535)의 Variant 속성과 1:1 */
const variants = [
  "default",
  "default-active",
  "primary",
  "secondary",
  "danger",
  "chip",
  "chip-active",
] as const;

const meta = {
  title: "Components/Button",
  component: Button,
  args: {
    text: "버튼",
    variant: "primary",
    disabled: false,
  },
  argTypes: {
    variant: { control: "select", options: variants },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 컨트롤 패널에서 variant/disabled를 바꿔가며 확인 */
export const Playground: Story = {};

/** 전체 variant × default/disabled 매트릭스 — Figma와 나란히 비교용 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-md">
      {variants.map((variant) => (
        <div key={variant} className="flex items-center gap-md">
          <span className="w-[120px] text-fm-caption text-muted-foreground">
            {variant}
          </span>
          <Button text="버튼" variant={variant} />
          <Button text="버튼" variant={variant} disabled />
        </div>
      ))}
    </div>
  ),
};
