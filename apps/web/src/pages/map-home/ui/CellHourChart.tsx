import { cn } from "@fillmap/ui-web";
import type { HomeCellDetail } from "@/features/map-home/model/home-cell-detail";
import type { UploadHourBucket } from "@/features/map-home/model/upload-hours";

interface CellHourChartProps {
  /** deriveUploadHourBuckets 결과 — 3시간×8버킷 (AC 9) */
  buckets: UploadHourBucket[];
  /** 표본 수 문구용 — 실제 피드 표본 수 (videoCount 집계 필드 아님, AC 10·추정 5) */
  sampleCount: number;
  /** 막대 색 키 — 테마 상세는 테마 색, 비테마 점령 상세는 primary (AC 11) */
  accent: HomeCellDetail["accent"];
}

/** 액센트 막대 색 — 토큰 클래스 리터럴 표 (BADGE_CLASS 관례) */
const ACCENT_BAR_CLASS: Record<HomeCellDetail["accent"], string> = {
  primary: "bg-primary",
  hot: "bg-theme-hot",
  festival: "bg-theme-festival",
  popup: "bg-theme-popup",
  route: "bg-theme-route",
};

/**
 * 활발한 시간대 막대 그래프 (MSG-277 2차 AC 10) — 구글맵 Popular times 참고.
 * 버킷당 막대 1개, 높이는 count 비례(최대 버킷 기준) — 차트 라이브러리 없이 div+토큰,
 * 높이만 데이터 구동 인라인 %(기확정 4 — better-tailwindcss 임의값 린트는 클래스 대상이라 저촉 없음).
 * 눈금 라벨은 0·6·12·18시만 표기 (추정 4).
 */
export const CellHourChart = ({
  buckets,
  sampleCount,
  accent,
}: CellHourChartProps) => {
  const max = Math.max(...buckets.map((b) => b.count), 0);
  // 보조기술 노출 — 시각 막대는 장식이라 분포 전체를 role="img" 라벨 한 문장으로 제공 (codex 리뷰 반영)
  const distributionLabel = `시간대별 업로드 분포: ${buckets
    .map((b) => `${b.startHour}시 ${b.count}개`)
    .join(", ")}`;

  return (
    <section className="flex flex-col gap-xs">
      <h3 className="flex items-baseline gap-xs text-fm-body-strong text-foreground">
        활발한 시간대
        <span className="text-fm-caption font-normal text-foreground-muted">
          영상 {sampleCount}개 기준
        </span>
      </h3>
      <div role="img" aria-label={distributionLabel} className="flex flex-col gap-xs">
        <div aria-hidden className="flex h-16 items-end gap-1">
          {buckets.map((bucket) => (
            <div
              key={bucket.startHour}
              className="flex h-full flex-1 items-end rounded-xs bg-surface"
            >
              <div
                className={cn("w-full rounded-xs", ACCENT_BAR_CLASS[accent])}
                style={{
                  height: max > 0 ? `${(bucket.count / max) * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>
        <div aria-hidden className="flex gap-1 text-fm-caption text-foreground-muted">
          {buckets.map((bucket) => (
            <span key={bucket.startHour} className="flex-1 text-center">
              {bucket.startHour % 6 === 0 ? `${bucket.startHour}시` : ""}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
