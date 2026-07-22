interface RegionProgressProps {
  /** 현재 지역명 (예: "마포구") — 백엔드 제공 표시값 (추정 A5) */
  regionName: string;
  /** 탐험률(%) — 0~100 클램프 완료 값 (AC 7) */
  pct: number;
}

/**
 * "{지역} 탐험률" 라벨 + 진행 바 + "N%" (AC 6) — Figma node 13399:1575 진행 블록.
 * 채움 너비가 퍼센트 값과 일치해야 하며, 동적 %는 스케일 클래스로 표현 불가라 인라인 style로 준다.
 */
export const RegionProgress = ({ regionName, pct }: RegionProgressProps) => (
  <div className="flex flex-col gap-xs">
    <div className="flex items-baseline justify-between">
      <span className="text-fm-body-strong text-foreground">
        {regionName} 탐험률
      </span>
      <span className="text-fm-body-strong text-primary">{pct}%</span>
    </div>
    <div
      role="progressbar"
      aria-label={`${regionName} 탐험률`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-1.5 overflow-hidden rounded-full bg-surface"
    >
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${pct}%` }}
      />
    </div>
  </div>
);
