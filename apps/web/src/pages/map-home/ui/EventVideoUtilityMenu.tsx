import type { ReactNode, RefObject } from "react";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronRight } from "lucide-react";
import {
  PLAYBACK_RATE_OPTIONS,
  type PlaybackRate,
  playbackRateLabel,
} from "@/features/event/model/event-video-view";

interface EventVideoUtilityMenuProps {
  /** 트리거로 감쌀 더보기(⋯) 버튼 */
  children: ReactNode;
  /** 재생 소스 — 다운로드 링크 대상. null(로딩·실패)이면 다운로드 비활성 */
  src: string | null;
  /** 재생 표면의 video 엘리먼트 — PIP 진입 대상 */
  videoRef: RefObject<HTMLVideoElement | null>;
  rate: PlaybackRate;
  onRateChange: (rate: PlaybackRate) => void;
}

const itemClass =
  "flex cursor-pointer items-center justify-between gap-sm rounded-sm px-sm py-2 text-fm-base text-foreground outline-none data-[highlighted]:bg-surface data-[disabled]:pointer-events-none data-[disabled]:text-foreground-muted";

/**
 * 행사 영상 재생 유틸리티 메뉴 (MSG-520 AC 13, 2026-08-31 사용자 결정) — Radix
 * DropdownMenu 기반(VideoMoreMenu 관례). 소유자 액션(삭제·공개·신고) 없이
 * **다운로드 · 재생 속도(0.5~2x) · PIP 모드**만 담는다.
 * - 다운로드: presigned URL이 cross-origin이라 `download` 파일명 지정이 안 먹을 수
 *   있어 새 탭 열림/저장 폴백을 허용한다 (스펙 오탐 방지 ②).
 * - PIP: 미지원 브라우저(`document.pictureInPictureEnabled` false)는 항목을 숨긴다.
 */
export const EventVideoUtilityMenu = ({
  children,
  src,
  videoRef,
  rate,
  onRateChange,
}: EventVideoUtilityMenuProps) => {
  const pipSupported = document.pictureInPictureEnabled === true;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 flex w-57 flex-col rounded-md border border-border bg-surface-elevated p-xs shadow-modal"
        >
          <DropdownMenu.Item asChild disabled={src === null}>
            <a
              href={src ?? undefined}
              download
              target="_blank"
              rel="noreferrer"
              className={itemClass}
            >
              다운로드
            </a>
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={itemClass}>
              재생 속도
              <span className="flex items-center gap-xxs text-fm-caption text-foreground-muted">
                {playbackRateLabel(rate)}
                <ChevronRight aria-hidden className="size-4" />
              </span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                className="z-50 flex w-31 flex-col rounded-md border border-border bg-surface-elevated p-xs shadow-modal"
              >
                <DropdownMenu.RadioGroup
                  value={String(rate)}
                  onValueChange={(value) =>
                    onRateChange(Number(value) as PlaybackRate)
                  }
                >
                  {PLAYBACK_RATE_OPTIONS.map((option) => (
                    <DropdownMenu.RadioItem
                      key={option}
                      value={String(option)}
                      className={`${itemClass} data-[state=checked]:font-semibold`}
                    >
                      {playbackRateLabel(option)}
                      <DropdownMenu.ItemIndicator className="text-primary">
                        <Check aria-hidden className="size-4" strokeWidth={3} />
                      </DropdownMenu.ItemIndicator>
                    </DropdownMenu.RadioItem>
                  ))}
                </DropdownMenu.RadioGroup>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          {pipSupported && (
            <DropdownMenu.Item
              className={itemClass}
              onSelect={() =>
                void videoRef.current?.requestPictureInPicture().catch(() => {})
              }
            >
              PIP 모드
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
