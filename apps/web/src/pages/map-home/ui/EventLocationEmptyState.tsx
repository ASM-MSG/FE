import { Play } from "lucide-react";
import { Button } from "@fillmap/ui-web";
import { useEventUploadEntry } from "./use-event-upload-entry";

interface EventLocationEmptyStateProps {
  /**
   * 종료 행사 열람 (MSG-535 AC 6) — true면 업로드 유도(문구·CTA) 대신
   * 보관 맥락 문구만 렌더한다 (MSG-519 AC 7 확장 적용)
   */
  readOnly?: boolean;
}

/**
 * 빈 행사 위치 상태 (MSG-518 AC 7) — Figma 15518:6612.
 * 재생 아이콘 원 + 안내 2줄 + 전폭 "첫 영상 올리기" CTA.
 * CTA는 행사 업로드 진입(MSG-521 AC 1) — 기존 업로드 위저드를 행사 귀속 모드로 연다.
 * MSG-535: readOnly(아카이브 열람)면 CTA 미렌더 + 보관 맥락 문구로 교체 (승인 문구).
 */
export const EventLocationEmptyState = ({
  readOnly = false,
}: EventLocationEmptyStateProps) => {
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
          {readOnly
            ? "이 위치에 남은 영상이 없어요"
            : "아직 이 위치에 올라온 영상이 없어요"}
        </p>
        <p className="text-fm-body text-foreground-muted">
          {readOnly
            ? "행사 기간에 올라온 영상이 없었어요"
            : "현장 영상을 가장 먼저 남겨보세요"}
        </p>
      </div>
      {!readOnly && (
        <Button
          text="첫 영상 올리기"
          className="w-full"
          onClick={openEventUpload}
        />
      )}
    </div>
  );
};
