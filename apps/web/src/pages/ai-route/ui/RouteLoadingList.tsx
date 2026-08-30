import { Skeleton } from "@fillmap/ui-web";

/**
 * 로딩 스켈레톤 카드 3장 (Figma 15666:12621) — 결과 카드와 같은 골격(원형 순번 + 3줄).
 * 막대 폭은 Figma 고정 폭(140/180/240)의 비율을 388px 패널에 맞춰 분수로 옮긴 것이다.
 */
const SKELETON_ROWS = [0, 1, 2];

export const RouteLoadingList = () => (
  <ul className="flex flex-col gap-1.5">
    {SKELETON_ROWS.map((row) => (
      <li
        key={row}
        className="flex items-start gap-sm rounded-md bg-surface-soft p-sm"
      >
        <Skeleton variant="pill" className="size-7 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-2.5 w-3/5" />
          <Skeleton className="h-2.5 w-4/5" />
        </div>
      </li>
    ))}
  </ul>
);
