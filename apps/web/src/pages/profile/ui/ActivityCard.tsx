const ActivityStat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center gap-xxs">
    <span className="text-fm-caption text-foreground-muted">{label}</span>
    <span className="text-fm-title text-foreground">{value}</span>
  </div>
);

/**
 * "내 활동" 요약 카드 1장 — 좌측 스트릭 · 우측 수집률.
 * [MSG-329 A4] 연속 기록·수집률은 프로필 명세(GET /api/users/me) 부재 — mock 값을 남기지
 * 않고 "—"로 표시한다. 도감 API 유도값으로 채우는 판단은 MSG-327 몫(카드 자리 보존,
 * 스펙 추정 1 확정). 카드 스타일은 DexStatCards의 StatCard 선례.
 */
export const ActivityCard = () => (
  <div className="grid grid-cols-2 gap-sm rounded-md border border-border bg-surface-soft py-md">
    <ActivityStat label="스트릭" value="—" />
    <ActivityStat label="수집률" value="—" />
  </div>
);
