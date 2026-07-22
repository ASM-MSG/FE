interface ActivityCardProps {
  /** 연속 스트릭 일수 — 도감 mock과 정합 (AC 5) */
  streakDays: number;
  /** 수집률 — 지역 라벨은 "부산" (서울 지명 금지, AC 6) */
  collectionRate: { regionLabel: string; pct: number };
}

const ActivityStat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center gap-xxs">
    <span className="text-fm-caption text-foreground-muted">{label}</span>
    <span className="text-fm-title text-foreground">{value}</span>
  </div>
);

/**
 * "내 활동" 요약 카드 1장 (AC 4) — 좌측 스트릭 · 우측 수집률.
 * 카드 스타일은 DexStatCards의 StatCard 선례(rounded-md·border·surface-soft)를 따른다.
 */
export const ActivityCard = ({
  streakDays,
  collectionRate,
}: ActivityCardProps) => (
  <div className="grid grid-cols-2 gap-sm rounded-md border border-border bg-surface-soft py-md">
    <ActivityStat label="스트릭" value={`${streakDays}일 연속`} />
    <ActivityStat
      label="수집률"
      value={`${collectionRate.regionLabel} ${collectionRate.pct}%`}
    />
  </div>
);
