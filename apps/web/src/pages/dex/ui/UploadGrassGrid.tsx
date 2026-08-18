import { useMemo } from "react";
import { cn } from "@fillmap/ui-web";
import {
  deriveMonthLabels,
  grassLevel,
  type GrassWeek,
} from "@/features/dex/model/upload-grass";

interface UploadGrassGridProps {
  /** buildGrassWeeks 파생 격자 — 열=주(일요일 시작), 미래 셀은 null(자리 없음) */
  weeks: GrassWeek[];
  /** sm=기록 탭 24주(9px 셀·3px 간격), lg=1년 모달 53주(12px 셀·4px 간격) */
  size: "sm" | "lg";
  /** 스크린리더용 요약 대체 텍스트 — 메타 라인과 동등 정보 (AC 12) */
  srSummary: string;
}

/** stride = 셀 + 간격 px — 월 라벨의 열 위치 산출(동적 값이라 style 경유) */
const SIZE = {
  sm: { cell: "size-2.25", gap: "gap-0.75", stride: 12 },
  lg: { cell: "size-3", gap: "gap-1", stride: 16 },
} as const;

/** 레벨→색 — lv0~3은 design-tokens 잔디 램프(A4), lv4는 primary. 임의 hex 클래스 금지 (AC 8) */
const LEVEL_CLASSES = [
  "bg-grass-0",
  "bg-grass-1",
  "bg-grass-2",
  "bg-grass-3",
  "bg-primary",
] as const;

/** 좌측 요일 라벨 — 월/수/금(행 1·3·5)만 표기, 행 0=일요일 (Figma 14786:3785, A2) */
const WEEKDAY_ROW_LABELS = ["", "월", "", "수", "", "금", ""] as const;

/**
 * 업로드 잔디 카드 (MSG-414 AC 7·8·9 공용 — Figma 14786:3572(탭)·14789:3834(모달)) —
 * 월 라벨 + 요일 라벨 + 주×7 격자 + 범례("적음~많음"). 격자는 시각 장식(aria-hidden)이고
 * 동등 정보는 srSummary가 담당한다 (AC 12). 도감 전용 1회 사용이라 pages/dex/ui 소속
 * (스펙 승격 후보 없음).
 */
export const UploadGrassGrid = ({
  weeks,
  size,
  srSummary,
}: UploadGrassGridProps) => {
  const { cell, gap, stride } = SIZE[size];
  const monthLabels = useMemo(() => deriveMonthLabels(weeks), [weeks]);

  return (
    <div className="rounded-md bg-surface-soft p-sm">
      <p className="sr-only">{srSummary}</p>
      <div aria-hidden="true" className="flex gap-xs">
        {/* 요일 라벨 열 — 월 라벨 행 높이(h-3.5)만큼 내려서 격자 행과 정렬 */}
        <div className={cn("flex shrink-0 flex-col pt-3.5", gap)}>
          {WEEKDAY_ROW_LABELS.map((label, row) => (
            <span
              key={row}
              className={cn(
                "flex items-center text-fm-caption leading-none text-foreground-muted",
                cell,
              )}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          {/* 월 라벨 행 — 실제 월 경계 기준 배치(시안의 4주 균등 배치는 플레이스홀더) */}
          <div className="relative h-3.5">
            {monthLabels.map(({ weekIndex, label }) => (
              <span
                key={weekIndex}
                className="absolute top-0 text-fm-caption leading-none text-foreground-muted"
                style={{ left: weekIndex * stride }}
              >
                {label}
              </span>
            ))}
          </div>
          {/* 격자 — 미래 셀(null)은 렌더하지 않는다(자리 없음, A2) */}
          <div className={cn("flex", gap)}>
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className={cn("flex flex-col", gap)}>
                {week.map((day, row) =>
                  day === null ? null : (
                    <span
                      key={row}
                      className={cn(
                        "rounded-[2px]",
                        cell,
                        LEVEL_CLASSES[grassLevel(day.count)],
                      )}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
          {/* 범례 — 적음 → 많음 5단 스와치 (Figma 14786:3785) */}
          <div className={cn("mt-xs flex items-center justify-end", gap)}>
            <span className="mr-xxs text-fm-caption leading-none text-foreground-muted">
              적음
            </span>
            {LEVEL_CLASSES.map((levelClass) => (
              <span
                key={levelClass}
                className={cn("rounded-[2px]", cell, levelClass)}
              />
            ))}
            <span className="ml-xxs text-fm-caption leading-none text-foreground-muted">
              많음
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
