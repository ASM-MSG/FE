import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "./button";

/** Figma "FeelMap Button" (node 13427:723)의 Variant 속성과 1:1 */
const variants = ["primary", "secondary", "danger"] as const;

const meta = {
  title: "Components/Button",
  component: Button,
  args: {
    text: "버튼",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Type × Size × State × Shape 매트릭스 — Figma와 나란히 비교용 */
export const AllVariants: Story = {
  render: () => (
    <View className="gap-md">
      {variants.map((variant) => (
        <View key={variant} className="flex-row items-center gap-md">
          <Button text="버튼" variant={variant} />
          <Button text="버튼" variant={variant} size="sm" />
          <Button text="버튼" variant={variant} disabled />
          <Button text="버튼" variant={variant} shape="pill" />
        </View>
      ))}
    </View>
  ),
};
