import { formatProgressRate } from "@/features/dex/model/region-label";

interface RegionProgressProps {
  /** 현재 행정동 표시명 (예: "부전2동") — 축약은 호출 측(shortRegionName)이 마친 값 */
  regionName: string;
  /** 탐험률(%) — 0~100 클램프 완료 값 (기준 4) */
  pct: number;
}

/**
 * "{행정동} 탐험률" 라벨 + 진행 바 + "N%" (기준 4) — Figma 진행 블록.
 * 채움 너비가 퍼센트 값과 일치해야 하며, 동적 %는 스케일 클래스로 표현 불가라 인라인 style로 준다.
 * 라벨 수치는 소수 첫째 자리까지만 보여주되(formatProgressRate), 채움 너비와 aria-valuenow는
 * 원값을 쓴다 — 보조기술에는 반올림하지 않은 진행률이 가야 한다.
 */
export const RegionProgress = ({ regionName, pct }: RegionProgressProps) => (
  <div className="flex flex-col gap-xs">
    <div className="flex items-baseline justify-between">
      <span className="text-fm-body-strong text-foreground">
        {regionName} 탐험률
      </span>
      <span className="text-fm-body-strong text-primary">
        {formatProgressRate(pct)}
      </span>
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
