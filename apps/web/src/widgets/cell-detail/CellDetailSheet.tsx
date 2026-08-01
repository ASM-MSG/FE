import { useEffect, useState } from "react";
import { MoreHorizontal, Play, Share2, X } from "lucide-react";
import { Button, cn, VideoRow } from "@fillmap/ui-web";
import type { Cell } from "@/entities/cell";
import {
  formatRelativeTime,
  formatViewCount,
} from "@/features/explore/model/cell-detail";
import { useCellDetailStore } from "@/features/explore/model/cell-detail-store";
import { formatDuration } from "@/features/explore/model/explore-cells";
import { CellMoreMenu } from "./CellMoreMenu";
import { ReportDialog } from "./ReportDialog";

interface CellDetailSheetProps {
  cell: Cell;
  className?: string;
}

/**
 * 격자 상세 시트 — 목록 오른쪽 컬럼에 나란히 붙는 신규 컨테이너(모달·전체 전환 아님, AC 1).
 * 대표 영상 플레이어(자리) / 격자 메타 / 통계 3항목 / 액션 버튼(자리) / "이 격자의 영상" 리스트로 구성.
 * BottomSheet(하단 도킹)와 역할이 달라 재사용하지 않고 별도 셸로 둔다(스펙 명시).
 * 대표 영상·닫기는 cell-detail-store를 구독한다. 실제 재생/업로드/공유는 [제외 범위]로 no-op.
 */
export const CellDetailSheet = ({ cell, className }: CellDetailSheetProps) => {
  const activeVideoId = useCellDetailStore((s) => s.activeVideoId);
  const selectVideo = useCellDetailStore((s) => s.selectVideo);
  const close = useCellDetailStore((s) => s.close);

  const [reportOpen, setReportOpen] = useState(false);

  const activeVideo =
    cell.videos.find((v) => v.videoId === activeVideoId) ?? cell.videos[0];
  const duration = formatDuration(activeVideo?.durationSec);

  // 우측 컬럼이 목록을 상당 부분 덮으므로 Escape로도 닫을 수 있게 한다 (키보드 접근성)
  // 신고 모달이 열려 있을 때는 Radix Dialog가 자체적으로 Escape를 처리하므로
  // 이 리스너가 상세 시트까지 함께 닫지 않도록 가드한다.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !reportOpen) close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, reportOpen]);

  return (
    <section
      className={cn(
        "flex flex-col overflow-y-auto bg-background shadow-raised scrollbar-gutter-stable",
        className,
      )}
    >
      <div className="flex flex-col gap-md p-md">
        {/* 대표 영상 플레이어 영역 (자리) — 재생 버튼 + 길이 (AC 10) */}
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-surface">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="size-5 fill-current" />
          </span>
          {duration && (
            <span className="absolute bottom-sm right-sm rounded-xs bg-navy-900/70 px-1.5 py-0.5 text-fm-caption text-foreground-inverse">
              {duration}
            </span>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="상세 닫기"
            className="absolute right-sm top-sm flex size-8 items-center justify-center rounded-full bg-navy-900/70 text-foreground-inverse transition-[filter] active:brightness-[0.86]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 격자명 + 위치 · 최근 업로드 (AC 11) */}
        <div className="flex flex-col gap-xs">
          <h2 className="text-fm-title text-foreground">{cell.label}</h2>
          <p className="text-fm-body text-foreground-muted">
            {cell.location} · 최근 업로드 {formatRelativeTime(cell.recentUploadedAt)}
          </p>
        </div>

        {/* 통계 — 담수율 / 영상 수 / 조회수 (AC 12) */}
        <dl className="flex items-stretch gap-sm">
          <Stat value={`${cell.fillRate}%`} label="담수율" />
          <Stat value={`${cell.videoCount}개`} label="영상" />
          <Stat value={formatViewCount(cell.viewCount)} label="조회" />
        </dl>

        {/* 액션 버튼 (자리, no-op) — 업로드 / 공유 / 더보기 (AC 15) */}
        <div className="flex items-center gap-sm">
          <Button
            text="이 격자에 영상 업로드"
            size="sm"
            className="flex-1"
          />
          <IconButton label="공유">
            <Share2 className="size-5" />
          </IconButton>
          <CellMoreMenu onReport={() => setReportOpen(true)}>
            <IconButton label="더보기">
              <MoreHorizontal className="size-5" />
            </IconButton>
          </CellMoreMenu>
        </div>
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} />

      {/* 이 격자의 영상 (AC 16·17·18) */}
      <div className="flex flex-col gap-sm px-md pb-md">
        <h3 className="text-fm-body-strong text-foreground">이 격자의 영상</h3>
        <ul className="flex flex-col gap-sm">
          {cell.videos.map((videoItem) => (
            <li key={videoItem.videoId}>
              <VideoRow
                title={videoItem.title}
                meta={`조회 ${formatViewCount(videoItem.viewCount)} · ${formatRelativeTime(videoItem.recordedAt)}`}
                thumbnailSrc={videoItem.thumbnailUrl}
                aria-current={videoItem.videoId === activeVideo?.videoId}
                onClick={() => selectVideo(videoItem.videoId)}
                className={cn(
                  "rounded-sm",
                  videoItem.videoId === activeVideo?.videoId && "bg-surface",
                )}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-1 flex-col items-center gap-0.5 rounded-sm bg-surface py-sm">
    <dt className="text-fm-caption text-foreground-muted">{label}</dt>
    <dd className="text-fm-body-strong text-foreground">{value}</dd>
  </div>
);

const IconButton = ({
  label,
  children,
  ...props
}: {
  label: string;
  children: React.ReactNode;
} & React.ComponentPropsWithRef<"button">) => (
  <button
    type="button"
    aria-label={label}
    className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-background text-foreground transition-[filter] active:brightness-[0.86]"
    {...props}
  >
    {children}
  </button>
);
