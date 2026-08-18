import { type ReactNode, useEffect, useState } from "react";
import { DropdownMenu } from "radix-ui";
import { Check } from "lucide-react";
import { Toast } from "@fillmap/ui-web";
import { useVideoPlaybackQuery } from "@/features/map-home/model/use-video-playback-query";
import { useSetVideoVisibility } from "../api/use-video-mutations";
import {
  shouldPatchVisibility,
  toPlaybackFeedVideo,
  type VideoActionTarget,
  type VideoVisibility,
  VISIBILITY_OPTIONS,
} from "../model/video-menu";
import { ReportDialog } from "./ReportDialog";
import { VideoDeleteConfirmDialog } from "./VideoDeleteConfirmDialog";

interface VideoMoreMenuProps {
  /** 트리거로 감쌀 더보기(⋯) 버튼 */
  children: ReactNode;
  target: VideoActionTarget;
  /** 내 영상 여부 — 내 영상: 공개 범위·삭제 / 타인: 신고 (AC 9, 자기 영상 신고 400 예방) */
  mine: boolean;
}

const VISIBILITY_ERROR_MESSAGE =
  "공개 범위를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.";
const TOAST_DURATION_MS = 3000;

const itemClass =
  "flex cursor-pointer items-center justify-between gap-sm rounded-sm px-sm py-2 text-fm-base outline-none data-[highlighted]:bg-surface";

/**
 * 영상 더보기(⋯) 메뉴 (MSG-411 AC 1·2·9, Figma 14791:3689) — Radix DropdownMenu 기반
 * (CellMoreMenu 관례). 내 영상은 "공개 범위" 섹션(전체 공개/나만 보기, 현재값 ✓) +
 * 구분선 + "영상 삭제"(error 색), 타인 영상은 "신고하기"만 노출한다.
 * 현재 공개 범위는 메뉴가 열릴 때(Content 마운트) 단건 재생 조회로 확보한다 —
 * 목록 응답에 visibility가 없다(스펙 코드 대조). 같은 값 재선택은 요청 없이 메뉴만
 * 닫히고(추정 5), 전환 실패는 토스트로 알린다 (AC 5).
 * 삭제 확인 모달·신고 모달·실패 토스트를 함께 소유한다 — 진입점(도감 갤러리 카드·
 * 미니 패널)은 이 컴포넌트 하나만 부착하면 된다.
 */
export const VideoMoreMenu = ({
  children,
  target,
  mine,
}: VideoMoreMenuProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setVisibility = useSetVideoVisibility({
    onError: () => setErrorMessage(VISIBILITY_ERROR_MESSAGE),
  });

  const handleVisibilitySelect = (
    next: VideoVisibility,
    current: string | null,
  ) => {
    if (!shouldPatchVisibility(current, next)) return; // 같은 값 — 메뉴만 닫힘
    setVisibility.mutate({ videoId: target.videoId, visibility: next });
  };

  // 에러 토스트 자동 소멸
  useEffect(() => {
    if (errorMessage === null) return;
    const timer = setTimeout(() => setErrorMessage(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>{children}</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 flex w-57 flex-col rounded-md border border-border bg-surface-elevated p-xs shadow-modal"
          >
            {mine ? (
              <MineMenuItems
                target={target}
                onVisibilitySelect={handleVisibilitySelect}
                onDeleteSelect={() => setDeleteOpen(true)}
              />
            ) : (
              <DropdownMenu.Item
                onSelect={() => setReportOpen(true)}
                className={`${itemClass} text-foreground`}
              >
                신고하기
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* 열릴 때만 마운트 — 카드 메타 보강 재생 조회가 모달 오픈 시에만 발사된다.
          삭제 성공 후속(미니 패널 닫기·캐시 정리)은 useDeleteVideo가 중앙 처리 (codex 리뷰 3) */}
      {deleteOpen && (
        <VideoDeleteConfirmDialog
          target={target}
          onOpenChange={setDeleteOpen}
        />
      )}
      <ReportDialog
        videoId={target.videoId}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />

      {errorMessage !== null && (
        <div className="fixed inset-x-0 bottom-md z-50 mx-auto w-[calc(100%-2rem)] max-w-120 px-md">
          <Toast title={errorMessage} />
        </div>
      )}
    </>
  );
};

interface MineMenuItemsProps {
  target: VideoActionTarget;
  onVisibilitySelect: (next: VideoVisibility, current: string | null) => void;
  onDeleteSelect: () => void;
}

/**
 * 내 영상 메뉴 본문 — DropdownMenu.Content 마운트(=메뉴 오픈) 시에만 렌더되므로
 * 단건 재생 조회(visibility ✓ 소스)가 메뉴를 열 때만 발사된다 (AC 2).
 * FRIENDS·미도착이면 어느 옵션에도 ✓가 없다 (추정 3).
 */
const MineMenuItems = ({
  target,
  onVisibilitySelect,
  onDeleteSelect,
}: MineMenuItemsProps) => {
  const { playback } = useVideoPlaybackQuery(toPlaybackFeedVideo(target));
  const current = playback?.visibility ?? null;

  return (
    <>
      <DropdownMenu.Label className="px-sm pb-xxs pt-xs text-fm-caption text-foreground-muted">
        공개 범위
      </DropdownMenu.Label>
      {VISIBILITY_OPTIONS.map((option) => (
        <DropdownMenu.CheckboxItem
          key={option.value}
          checked={current === option.value}
          onSelect={() => onVisibilitySelect(option.value, current)}
          className={`${itemClass} text-foreground data-[state=checked]:font-semibold`}
        >
          {option.label}
          <DropdownMenu.ItemIndicator className="text-primary">
            <Check className="size-4" strokeWidth={3} />
          </DropdownMenu.ItemIndicator>
        </DropdownMenu.CheckboxItem>
      ))}
      <DropdownMenu.Separator className="my-xs h-px bg-border" />
      <DropdownMenu.Item
        onSelect={onDeleteSelect}
        className={`${itemClass} text-error`}
      >
        영상 삭제
      </DropdownMenu.Item>
    </>
  );
};
