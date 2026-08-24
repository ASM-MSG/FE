interface StatItem {
  label: string;
  value: string;
  /**
   * 값 클릭 액션 (MSG-463 AC 9) — 비로그인 "내 진행" 칸의 로그인 유도처럼 값 자리가
   * 행동을 여는 경우만. 없으면 종전처럼 정적 텍스트다
   */
  onClick?: () => void;
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
        // justify-center: 옆 칸이 두 줄로 자라도 한 줄 칸의 내용이 위로 붙지 않는다
        className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-sm border border-border px-xxs py-xs"
      >
        <dt className="text-center text-fm-caption text-foreground-muted">
          {item.label}
        </dt>
        {/* text-center: 두 줄로 감기면 dd 상자가 칸 폭까지 늘어나 기본 좌측 정렬이
            드러난다(운영시간 사용자 보고). break-keep: `수-일`·`09:30` 같은 토큰
            중간에서 끊지 않고 공백에서만 줄바꿈 */}
        <dd className="break-keep text-center text-fm-body-strong text-foreground">
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="text-primary transition-opacity active:opacity-60"
            >
              {item.value}
            </button>
          ) : (
            item.value
          )}
        </dd>
      </div>
    ))}
  </dl>
);
