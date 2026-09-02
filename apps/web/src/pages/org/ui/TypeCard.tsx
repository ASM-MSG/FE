import { CircleCheck, PartyPopper, Store, Users } from "lucide-react";
import { cn } from "@fillmap/ui-web";
import type {
  SubmissionType,
  SubmissionTypeCard,
} from "@/features/event-submission/model/submission-form";

const TYPE_ICONS: Record<SubmissionType, typeof PartyPopper> = {
  FESTIVAL: PartyPopper,
  POPUP: Store,
  EVENT: Users,
};

interface TypeCardProps {
  card: SubmissionTypeCard;
  selected: boolean;
  onSelect: () => void;
}

/**
 * 등록 유형 카드 (AC 1·2 — Figma 15525:8851).
 * 라디오 시맨틱 버튼 — 선택 카드는 블루 테두리 + 우상단 체크다.
 */
export const TypeCard = ({ card, selected, onSelect }: TypeCardProps) => {
  const Icon = TYPE_ICONS[card.type];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-start gap-sm rounded-md border p-md text-left transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-surface-soft",
      )}
    >
      <span className="flex w-full items-start justify-between">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-sm",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-background text-icon",
          )}
        >
          <Icon className="size-5" />
        </span>
        {selected ? (
          <CircleCheck className="size-5 text-primary" />
        ) : (
          <span className="size-5 rounded-full border border-hairline-strong" />
        )}
      </span>
      <span className="text-fm-title text-foreground">{card.title}</span>
      <span className="text-fm-body text-foreground-muted">
        {card.description}
      </span>
      {card.metaVariant === "badge" ? (
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-fm-label text-primary">
          {card.meta}
        </span>
      ) : (
        <span className="text-fm-label text-foreground-muted">{card.meta}</span>
      )}
    </button>
  );
};
