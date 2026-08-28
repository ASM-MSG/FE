import { cn } from "@fillmap/ui-web";
import {
  kindTag,
  stopMetaLine,
  type RouteKindTone,
} from "@/features/ai-route/model/route-point-view";
import type { RoutePointDto } from "@/shared/api/generated";

/**
 * 추천 지점 카드 (Figma 15666:12855) — 순번 뱃지 · 이름 · kind 태그 · 표시명 · reason.
 * 도메인(추천 지점) 컴포넌트라 ui-web 승격 대상이 아니다(규칙 3).
 * 태그 색은 tone(의미) → 토큰 클래스 매핑이다 — 모델은 tailwind를 모른다 (§6).
 */
const TONE_CLASS: Record<RouteKindTone, string> = {
  place: "bg-primary/12 text-primary",
  festival: "bg-theme-festival/12 text-theme-festival",
  popup: "bg-theme-popup/12 text-theme-popup",
  route: "bg-theme-route/12 text-theme-route",
};

interface RouteStopCardProps {
  point: RoutePointDto;
  selected: boolean;
  onSelect: () => void;
}

export const RouteStopCard = ({
  point,
  selected,
  onSelect,
}: RouteStopCardProps) => {
  const tag = kindTag(point.kind);
  const meta = stopMetaLine(point);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-sm rounded-md bg-surface-soft p-sm text-left",
        selected && "ring-2 ring-theme-route",
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-theme-route text-fm-body-strong text-primary-foreground shadow-raised">
        {point.order}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-xs">
          <span className="truncate text-fm-title text-foreground">
            {point.name}
          </span>
          {tag && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-px text-fm-caption",
                TONE_CLASS[tag.tone],
              )}
            >
              {tag.label}
            </span>
          )}
        </span>
        {meta && (
          <span className="text-fm-label text-foreground-muted">{meta}</span>
        )}
        <span className="text-fm-body text-foreground-body">
          {point.reason}
        </span>
      </span>
    </button>
  );
};
