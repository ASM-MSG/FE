import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "./lib/utils";

interface DialogShellProps {
  open: boolean;
  /** Esc·scrim 클릭 닫기 요청이 Radix onOpenChange(false)로 전달된다 */
  onOpenChange: (open: boolean) => void;
  /**
   * 스크린리더 전용 다이얼로그 타이틀. 생략하면 children이 직접
   * Radix `Dialog.Title`을 렌더해야 한다(가시 헤딩을 asChild로 승격하는 경우 등).
   */
  srTitle?: string;
  /** true면 뷰포트를 넘는 콘텐츠를 컨테이너 스크롤로 담는다 (스텝형·긴 콘텐츠 모달) */
  scrollable?: boolean;
  children: ReactNode;
}

/**
 * 모달 프레이밍 셸 — Radix Dialog의 Root/Portal/Overlay(딤)/Content(중앙 고정) 조합.
 * Figma에 프레이밍 정의가 없어 앱 모달 관례를 컴포넌트화한 것이다 (MSG-46 PR #23 R2 —
 * UploadModal·ProfileEditModal·ReportDialog·LoginModal 4곳 중복 추출). 포커스 트랩·
 * Esc/scrim 닫기는 Radix가 제공한다.
 *
 * 셸은 크롬(카드 배경·타이틀 행·닫기 버튼)을 갖지 않는다 — 카드 시각과 ✕는
 * children(ModalCard의 title-row 또는 모달 로컬)이 담당한다. ✕ 슬롯을 셸에 표준화하면
 * ModalCard의 onClose ✕와 이중이 되므로 두지 않는다 (PR #23 R3 판단).
 * 설명 텍스트는 가시 콘텐츠로 전달되므로 aria-describedby는 비운다.
 *
 * @example
 * <DialogShell open={open} onOpenChange={setOpen} srTitle="영상 신고">
 *   <ModalCard title="영상 신고" onClose={() => setOpen(false)}>…</ModalCard>
 * </DialogShell>
 */
export const DialogShell = ({
  open,
  onOpenChange,
  srTitle,
  scrollable,
  children,
}: DialogShellProps) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-navy-900/40" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-120 -translate-x-1/2 -translate-y-1/2 outline-none",
          scrollable && "max-h-[calc(100dvh-2rem)] overflow-y-auto",
        )}
      >
        {srTitle && (
          <DialogPrimitive.Title className="sr-only">
            {srTitle}
          </DialogPrimitive.Title>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);
