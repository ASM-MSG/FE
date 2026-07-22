interface DexStatCardsProps {
  collectedCellCount: number;
  badgeCount: number;
  streakDays: number;
}

const StatCard = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center gap-xxs rounded-md border border-border bg-surface-soft py-md">
    <span className="text-fm-title text-foreground">{value}</span>
    <span className="text-fm-caption text-foreground-muted">{label}</span>
  </div>
);

/** 통계 카드 3장 — 수집 격자 · 획득 뱃지 · 연속 스트릭 (AC 8) — Figma node 13399:1575 카드 행 */
export const DexStatCards = ({
  collectedCellCount,
  badgeCount,
  streakDays,
}: DexStatCardsProps) => (
  <div className="grid grid-cols-3 gap-sm">
    <StatCard value={`${collectedCellCount}개`} label="수집 격자" />
    <StatCard value={`${badgeCount}개`} label="획득 뱃지" />
    <StatCard value={`${streakDays}일`} label="연속 스트릭" />
  </div>
);
