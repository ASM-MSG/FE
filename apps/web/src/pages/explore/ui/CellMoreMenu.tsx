import type { ReactNode } from "react";
import { DropdownMenu } from "radix-ui";

interface CellMoreMenuProps {
  /** 트리거로 감쌀 더보기(⋯) 버튼 */
  children: ReactNode;
  /** 신고하기 선택 시 호출 (모달 열기) */
  onReport: () => void;
}

/**
 * 격자 더보기(⋯) 드롭다운 메뉴 — Radix DropdownMenu 기반 페이지 로컬 구현.
 * 항목: 수정하기 / 삭제하기(둘 다 no-op, 메뉴만 닫힘) / 신고하기(→ onReport).
 * 바깥 클릭·Escape 닫힘, 포털 렌더는 Radix 기본 제공 — S1·S2·S3·S10.
 */
export const CellMoreMenu = ({ children, onReport }: CellMoreMenuProps) => (
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={4}
        className="z-50 flex min-w-[140px] flex-col gap-xxs rounded-md border border-border bg-surface-elevated p-xs shadow-modal"
      >
        <DropdownMenu.Item className="cursor-pointer rounded-sm px-sm py-2 text-fm-base text-foreground outline-none data-[highlighted]:bg-surface">
          수정하기
        </DropdownMenu.Item>
        <DropdownMenu.Item className="cursor-pointer rounded-sm px-sm py-2 text-fm-base text-foreground outline-none data-[highlighted]:bg-surface">
          삭제하기
        </DropdownMenu.Item>
        <DropdownMenu.Item
          onSelect={onReport}
          className="cursor-pointer rounded-sm px-sm py-2 text-fm-base text-foreground outline-none data-[highlighted]:bg-surface"
        >
          신고하기
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);
