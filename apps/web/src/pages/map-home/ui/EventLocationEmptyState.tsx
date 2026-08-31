import { Play } from "lucide-react";
import { Button } from "@fillmap/ui-web";
import { useEventUploadEntry } from "./use-event-upload-entry";

/**
 * 빈 행사 위치 상태 (MSG-518 AC 7) — Figma 15518:6612.
 * 재생 아이콘 원 + 안내 2줄 + 전폭 "첫 영상 올리기" CTA.
 * CTA는 행사 업로드 진입(MSG-521 AC 1) — 기존 업로드 위저드를 행사 귀속 모드로 연다.
 */
export const EventLocationEmptyState = () => {
  const openEventUpload = useEventUploadEntry();

  return (
    <div className="flex flex-col items-center gap-lg rounded-md bg-background px-lg py-xxl text-center shadow-raised">
      <span
        aria-hidden
        className="flex size-18 items-center justify-center rounded-full bg-event-tint text-primary"
      >
        <Play className="size-6 fill-current" />
      </span>
      <div className="flex flex-col gap-xs">
        <p className="text-fm-title text-foreground">
          아직 이 위치에 올라온 영상이 없어요
        </p>
        <p className="text-fm-body text-foreground-muted">
          현장 영상을 가장 먼저 남겨보세요
        </p>
      </div>
      <Button
        text="첫 영상 올리기"
        className="w-full"
        onClick={openEventUpload}
      />
    </div>
  );
};
