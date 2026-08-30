import type { Meta, StoryObj } from "@storybook/react-vite";
import { Skeleton } from "./skeleton";

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextLine: Story = { args: { variant: "text-line" } };

export const Pill: Story = { args: { variant: "pill" } };

/** AI 경로추천 로딩 카드 — 원형 순번 자리 + 3줄 막대 (MSG-488) */
export const LoadingCard: Story = {
  render: () => (
    <div className="flex w-80 items-start gap-sm rounded-md bg-surface-soft p-sm">
      <Skeleton variant="pill" className="size-7 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-2.5 w-3/5" />
        <Skeleton className="h-2.5 w-4/5" />
      </div>
    </div>
  ),
};
