import type { ComponentProps } from "react";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useLoginModalStore } from "../model/login-modal-store";
import { LoginContent } from "./LoginContent";

/**
 * 모달 타이틀 렌더러 — LoginContent의 가시 타이틀(h2)을 그대로 Radix Dialog.Title로 만든다.
 * sr-only 중복 타이틀 없이 가시 헤딩 하나가 곧 다이얼로그 접근성 이름이다.
 * 베이스 화면(지도 페이지)에 h1이 이미 있으므로 모달 타이틀은 h2.
 */
const ModalTitle = (props: ComponentProps<"h2">) => (
  <Dialog.Title asChild>
    <h2 {...props} />
  </Dialog.Title>
);

/**
 * 로그인 모달 (MSG-46 후속 2) — 로그아웃 상태에서 SideRail 프로필 클릭 시 현재 화면 위에
 * 뜬다(G1, URL 불변). /login 페이지는 제거되어 이 모달이 로그인 UI의 유일한 진입이다(G7).
 * 콘텐츠는 Figma 13729:5021 구조 그대로 LoginContent를 단일 소스로 렌더한다(G2).
 * 프레이밍(오버레이·포털·Esc/scrim 닫기·포커스 트랩·✕)은
 * Figma에 정의가 없어 앱 모달 관례(UploadModal·ProfileEditModal의 Radix Dialog)를 따른다(G3).
 * ModalCard 미사용 — 필수 가시 title 행(좌측 정렬 h2)이 페이지와 동일해야 하는 중앙 정렬
 * 콘텐츠 타이틀과 중복·충돌한다. 카드 셸 시각(라운드·surface-elevated·p-7·shadow-modal)은
 * ModalCard와 동일 토큰을 사용한다.
 * 열림 상태는 전역 스토어(login-modal-store) — AppLayout에 1회 마운트(업로드 모달 관례).
 */
export const LoginModal = () => {
  const open = useLoginModalStore((s) => s.open);
  const closeModal = useLoginModalStore((s) => s.closeModal);

  // Esc·scrim 클릭은 Radix가 onOpenChange(false)로 전달 — 이 모달만 닫는다 (G3)
  const handleOpenChange = (next: boolean) => {
    if (!next) closeModal();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-120 -translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none"
        >
          <div className="relative flex w-full flex-col rounded-[20px] bg-surface-elevated p-7 shadow-modal">
            <button
              type="button"
              aria-label="닫기"
              onClick={closeModal}
              className="absolute right-7 top-7 text-foreground-muted transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <LoginContent titleAs={ModalTitle} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
