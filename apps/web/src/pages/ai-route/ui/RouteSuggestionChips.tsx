import { Chip } from "@fillmap/ui-web";

/**
 * 예시 문장 칩 (Figma 15666:12402) — 누르면 그 문장이 입력창에 채워진다 (S3).
 * 문구는 플레이스홀더가 아니라 FE가 고정으로 심는 실문구다 (MVP 지역 = 부산 서면).
 * ui-web Chip 기본에는 보더가 없어 `border-border`를 덧댄다 — `active`는 쓰지 않는다
 * (체크 아이콘이 강제되므로).
 */
const SUGGESTIONS = [
  "서면에서 밥 먹고 저녁 경기까지 동선 짜 줘",
  "지금 하는 축제 위주로 반나절 코스",
] as const;

interface RouteSuggestionChipsProps {
  onSelect: (text: string) => void;
}

export const RouteSuggestionChips = ({
  onSelect,
}: RouteSuggestionChipsProps) => (
  <div className="flex flex-col items-start gap-xs">
    <p className="text-fm-label text-foreground-muted">이렇게 물어보세요</p>
    {SUGGESTIONS.map((text) => (
      <Chip
        key={text}
        text={text}
        className="border border-border"
        onClick={() => onSelect(text)}
      />
    ))}
  </div>
);
