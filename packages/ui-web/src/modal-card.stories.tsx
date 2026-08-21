import type { Meta, StoryObj } from "@storybook/react-vite";
import { ModalCard } from "./modal-card";

const meta = {
  title: "Components/ModalCard",
  component: ModalCard,
  args: {
    title: "모달 타이틀",
    description:
      "설명 텍스트가 들어갑니다. 상황에 맞는 안내 문구를 작성하세요.",
    cancelText: "취소",
    confirmText: "확인",
    onClose: () => {},
  },
} satisfies Meta<typeof ModalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 스토리 공통 렌더 — surface 배경 위 카드 + 콘텐츠 슬롯 플레이스홀더 (4개 스토리 중복 추출, MSG-352) */
const renderCard: Story["render"] = (args) => (
  <div className="bg-surface p-lg">
    <ModalCard {...args}>
      <div className="flex h-20 w-full items-center justify-center rounded-sm border border-dashed border-hairline-strong text-fm-caption text-foreground-muted">
        콘텐츠 영역
      </div>
    </ModalCard>
  </div>
);

export const Playground: Story = {
  render: renderCard,
};

/** confirmDisabled=true — 확인 버튼 비활성(클릭 차단 + 비활성 시각). */
export const ConfirmDisabled: Story = {
  args: { confirmDisabled: true },
  render: renderCard,
};

/** secondaryText — 버튼 행 아래 전폭 보조(soft) 버튼. 위저드 "이전 단계로" 등 스택형 보조 액션. */
export const StackedSecondary: Story = {
  args: {
    cancelText: undefined,
    confirmText: "지금 게시하기",
    secondaryText: "이전 단계로",
    onSecondary: () => {},
  },
  render: renderCard,
};

/** confirmVariant="danger" — 삭제·신고 등 파괴적 액션용 확인 버튼. */
export const ConfirmDanger: Story = {
  args: { confirmVariant: "danger", confirmText: "삭제" },
  render: renderCard,
};
