interface SortChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/**
 * 정렬 토글 칩 — Figma "격자 썸네일 뷰"(node 13399:1262)의 chip/chip-active 버튼.
 * 공용 ui-web `Chip`(FeelMap Chip, 13428:693)은 active 시 체크 아이콘이 붙어 폭이 변하므로
 * 이 화면의 "폭 고정, 색만 전환" 디자인과 맞지 않아 로컬로 둔다.
 */
export const SortChip = ({ label, active, onClick }: SortChipProps) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={
      active
        ? "min-w-10 rounded-full bg-primary px-3 py-1.5 text-fm-body-strong text-primary-foreground"
        : "min-w-10 rounded-full border border-border bg-surface-soft px-3 py-1.5 text-fm-body-strong text-foreground-body"
    }
  >
    {label}
  </button>
);
