import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";

/** Figma "FeelMap Button" (node 13427:723)의 Variant 속성과 1:1 */
const variants = ["primary", "secondary", "danger"] as const;
const sizes = ["lg", "sm"] as const;

const meta = {
  title: "Components/Button",
  component: Button,
  args: {
    text: "버튼",
    variant: "primary",
    size: "lg",
    disabled: false,
  },
  argTypes: {
    variant: { control: "select", options: variants },
    size: { control: "select", options: sizes },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 컨트롤 패널에서 variant/size/disabled를 바꿔가며 확인 */
export const Playground: Story = {};

/** Type × Size × State 매트릭스 — Figma와 나란히 비교용 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-md">
      {variants.map((variant) => (
        <div key={variant} className="flex items-center gap-md">
          <span className="w-[100px] text-fm-caption text-muted-foreground">
            {variant}
          </span>
          {sizes.map((size) => (
            <Button key={size} text="버튼" variant={variant} size={size} />
          ))}
          <Button text="버튼" variant={variant} disabled />
        </div>
      ))}
    </div>
  ),
};
