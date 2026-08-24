import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { Thumbnail } from "./thumbnail";

/** 부모를 채우는 컴포넌트 — 스토리는 카드 실사용과 같은 relative 컨테이너로 감싼다 */
const CardFrame = ({ children }: { children: ReactNode }) => (
  <span className="relative flex aspect-video w-80 items-center justify-center overflow-hidden rounded-sm bg-surface">
    {children}
  </span>
);

const meta = {
  title: "Components/Thumbnail",
  component: Thumbnail,
  args: { src: null },
  decorators: [
    (Story, { name }) =>
      name === "Small Square" ? (
        // 삭제 확인 모달의 size-16 정사각 사용례 — 마크가 60%로 축소된다
        <span className="relative flex size-16 items-center justify-center overflow-hidden rounded-sm bg-surface">
          <Story />
        </span>
      ) : (
        <CardFrame>
          <Story />
        </CardFrame>
      ),
  ],
} satisfies Meta<typeof Thumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** src null — 기본 이미지(격자 로고 플레이스홀더, Figma 15231:353) */
export const Fallback: Story = {};

/** 정상 로드 — 부모를 object-cover로 채운다 */
export const Loaded: Story = {
  args: {
    src: "https://picsum.photos/seed/fillmap/640/360",
    alt: "영상 썸네일",
  },
};

/** 로드 실패 — 무효 URL이 onError로 기본 이미지 폴백에 합류한다 */
export const BrokenUrl: Story = {
  args: { src: "https://invalid.example/broken.jpg" },
};

/** 삭제 확인 모달 크기 — size-16 정사각 컨테이너 */
export const SmallSquare: Story = {};
