import { useMemo } from "react";
import { X } from "lucide-react";
import { DialogShell } from "@fillmap/ui-web";
import type { UploadHistoryDay } from "@/entities/dex";
import {
  GRASS_MODAL_WEEKS,
  buildGrassWeeks,
  deriveGrassSummary,
} from "@/features/dex/model/upload-grass";
import { UploadGrassGrid } from "./UploadGrassGrid";

interface UploadHistoryModalProps {
  open: boolean;
  /** ✕·Esc·스크림 닫기 요청 — Radix onOpenChange(false)로 수렴 (AC 9) */
  onOpenChange: (open: boolean) => void;
  /** 전체 업로드 이력(희소) — 53주 창 필터는 파생 몫 */
  history: UploadHistoryDay[];
  /** KST 오늘 — 탭 본문과 같은 값 주입(파생 창 일치) */
  todayKst: string;
}

/**
 * 기록 전체 보기 — 1년(53주) 잔디 모달 (MSG-414 AC 9, Figma 14783:3808 · 모달 카드
 * 14789:3824). DialogShell(포커스 트랩·Esc·스크림 닫기)의 폭 옵션으로 시안 960px
 * (max-w-240)를 수용한다. 열림/닫힘은 로컬 상태 — URL 불변 (A6은 스펙 넘버링상 폭 옵션,
 * URL 무관여는 AC 9 명시). 헤드라인·부제 수치는 실데이터 파생(시안 128일·4개·토요일은
 * 플레이스홀더).
 */
export const UploadHistoryModal = ({
  open,
  onOpenChange,
  history,
  todayKst,
}: UploadHistoryModalProps) => {
  const weeks = useMemo(
    () => buildGrassWeeks(history, todayKst, GRASS_MODAL_WEEKS),
    [history, todayKst],
  );
  const summary = useMemo(
    () => deriveGrassSummary(history, todayKst, GRASS_MODAL_WEEKS),
    [history, todayKst],
  );
  // 업로드 0일이면 활발 요일이 없다 — 그 조각만 생략한다 (A7 연장: 별도 빈 상태 없음)
  const subtitle = [
    `최장 연속 ${summary.longestStreak}일`,
    `하루 최다 ${summary.maxDailyCount}개`,
    ...(summary.mostActiveWeekday !== null
      ? [`가장 활발한 요일 ${summary.mostActiveWeekday}`]
      : []),
  ].join(" · ");

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      srTitle="업로드 기록"
      maxWidthClassName="max-w-240"
    >
      <div className="flex w-full flex-col gap-md rounded-[20px] bg-surface-elevated p-7 shadow-modal">
        <div className="flex items-center gap-sm">
          <h2 className="min-w-0 flex-1 text-fm-display text-foreground">
            업로드 기록
          </h2>
          {/* "최근 1년" 정적 라벨 — API가 기간 파라미터를 받지 않아 연도 전환 데이터가
              없다. 동작 없는 드롭다운 시늉(캐럿)은 기만적이라 제거 (A5 — 시안과 의도적 차이) */}
          <span className="rounded-full border border-border bg-surface-soft px-3 py-1.5 text-fm-body text-foreground-body">
            최근 1년
          </span>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => onOpenChange(false)}
            className="shrink-0 text-foreground-muted transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-xxs">
          <p className="text-fm-title text-foreground">
            지난 1년 동안 {summary.uploadDayCount}일 업로드했어요
          </p>
          <p className="text-fm-body text-foreground-muted">{subtitle}</p>
        </div>
        <UploadGrassGrid
          weeks={weeks}
          size="lg"
          srSummary={`지난 1년 업로드 잔디: ${summary.uploadDayCount}일 업로드 · ${subtitle}`}
        />
      </div>
    </DialogShell>
  );
};
