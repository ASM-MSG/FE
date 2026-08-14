interface StatItem {
  label: string;
  value: string;
}

interface StatTrioProps {
  /** 3분할 스탯 — 값이 없는 칸(거리·소요시간 미제공)은 호출부가 걸러서 넘긴다 */
  items: StatItem[];
}

/**
 * 미션·코스 상세의 분할 스탯 행 (MSG-395 AC 17·22, Figma 14599-9998 · 14599-10258).
 * 축제는 `내 진행 · 축제 기간 · 올라온 영상`, 코스는 `내 진행 · 거리 · 소요 시간`으로
 * 항목만 다르고 생김새가 같아 한 조각으로 둔다.
 */
export const StatTrio = ({ items }: StatTrioProps) => (
  <dl className="flex gap-xs">
    {items.map((item) => (
      <div
        key={item.label}
        className="flex flex-1 flex-col items-center gap-0.5 rounded-sm border border-border py-xs"
      >
        <dt className="text-fm-caption text-foreground-muted">{item.label}</dt>
        <dd className="text-fm-body-strong text-foreground">{item.value}</dd>
      </div>
    ))}
  </dl>
);
