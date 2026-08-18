import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { DialogShell } from "./dialog-shell";
import { ModalCard } from "./modal-card";

const meta = {
  title: "Components/DialogShell",
  component: DialogShell,
} satisfies Meta<typeof DialogShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 조합 데모 — 셸(딤·중앙 고정·포커스 트랩) 안에 ModalCard를 담는다. */
const PlaygroundDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-surface p-lg">
      <Button text="모달 열기" onClick={() => setOpen(true)} />
      <DialogShell open={open} onOpenChange={setOpen} srTitle="예시 모달">
        <ModalCard
          title="예시 모달"
          description="Esc·바깥 클릭·✕로 닫힙니다."
          cancelText="취소"
          confirmText="확인"
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
        >
          <div className="flex h-20 w-full items-center justify-center rounded-sm border border-dashed border-hairline-strong text-fm-caption text-foreground-muted">
            콘텐츠 영역
          </div>
        </ModalCard>
      </DialogShell>
    </div>
  );
};

export const Playground: Story = {
  args: { open: false, onOpenChange: () => {}, children: null },
  render: () => <PlaygroundDemo />,
};

/** scrollable 데모 — 뷰포트를 넘는 콘텐츠가 컨테이너 스크롤로 담긴다. */
const ScrollableDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-surface p-lg">
      <Button text="긴 모달 열기" onClick={() => setOpen(true)} />
      <DialogShell
        open={open}
        onOpenChange={setOpen}
        srTitle="긴 콘텐츠 모달"
        scrollable
      >
        <ModalCard
          title="긴 콘텐츠 모달"
          confirmText="확인"
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
        >
          <div className="flex h-[120vh] w-full items-start justify-center rounded-sm border border-dashed border-hairline-strong pt-md text-fm-caption text-foreground-muted">
            뷰포트보다 긴 콘텐츠
          </div>
        </ModalCard>
      </DialogShell>
    </div>
  );
};

/** scrollable — 스텝형·긴 콘텐츠 모달용 컨테이너 스크롤. */
export const Scrollable: Story = {
  args: { open: false, onOpenChange: () => {}, children: null },
  render: () => <ScrollableDemo />,
};

/** maxWidthClassName 데모 — 기본 480px을 넘는 넓은 모달 (MSG-414 1년 잔디 960px). */
const WideDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-surface p-lg">
      <Button text="넓은 모달 열기" onClick={() => setOpen(true)} />
      <DialogShell
        open={open}
        onOpenChange={setOpen}
        srTitle="넓은 모달"
        maxWidthClassName="max-w-240"
      >
        <ModalCard
          title="넓은 모달"
          description="maxWidthClassName=max-w-240(960px) — 기본값은 max-w-120(480px)으로 불변."
          confirmText="확인"
          onConfirm={() => setOpen(false)}
          onClose={() => setOpen(false)}
          className="max-w-none"
        >
          <div className="flex h-20 w-full items-center justify-center rounded-sm border border-dashed border-hairline-strong text-fm-caption text-foreground-muted">
            넓은 콘텐츠 영역
          </div>
        </ModalCard>
      </DialogShell>
    </div>
  );
};

/** 폭 확장 — 넓은 콘텐츠(연간 그래프 등) 모달. */
export const Wide: Story = {
  args: { open: false, onOpenChange: () => {}, children: null },
  render: () => <WideDemo />,
};
